import { Context, Effect, Layer } from "effect"
import { embedMany } from "ai"
import { ollama } from "ollama-ai-provider-v2"
import { db, schema } from "../db/index.ts"
import { eq, sql, cosineDistance, desc } from "drizzle-orm"
import type { Paper, PaperChunk } from "../db/schema.ts"

const PDFTOTEXT_PATH = "/opt/homebrew/bin/pdftotext"
const EMBEDDING_MODEL = "nomic-embed-text"
const CHUNK_SIZE = 512
const CHUNK_OVERLAP = 50

export type IndexProgress = {
  total: number
  completed: number
  currentFile: string | null
  status: "scanning" | "indexing" | "done" | "error"
  error?: string
}

export class IndexingService extends Context.Tag("IndexingService")<
  IndexingService,
  {
    readonly indexPaper: (paper: Paper, filePath: string) => Effect.Effect<PaperChunk[], Error>
    readonly indexFileIfNeeded: (projectId: string, filePath: string) => Effect.Effect<void, Error>
    readonly indexFolder: (
      projectId: string,
      folderPath: string,
      onProgress: (progress: IndexProgress) => void
    ) => Effect.Effect<void, Error>
    readonly isIndexed: (paperId: string) => Effect.Effect<boolean, Error>
    readonly deletePaperIndex: (paperId: string) => Effect.Effect<void, Error>
    readonly searchSimilar: (
      projectId: string,
      query: string,
      limit?: number
    ) => Effect.Effect<Array<{ chunk: PaperChunk; paper: Paper; similarity: number }>, Error>
  }
>() {}

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = []
  const sentences = text.split(/(?<=[.!?])\s+/)
  let currentChunk = ""

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      const words = currentChunk.split(" ")
      currentChunk = words.slice(-overlap).join(" ") + " " + sentence
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks.filter((c) => c.length > 20)
}

export const IndexingServiceLive = Layer.succeed(
  IndexingService,
  IndexingService.of({
    indexPaper: (paper: Paper, filePath: string) =>
      Effect.tryPromise({
        try: async () => {
          const text = await Bun.$`${PDFTOTEXT_PATH} -layout ${filePath} -`.text()

          if (!text.trim()) {
            throw new Error("Failed to extract text from PDF")
          }

          const chunks = chunkText(text, CHUNK_SIZE, CHUNK_OVERLAP)

          if (chunks.length === 0) {
            return []
          }

          const { embeddings } = await embedMany({
            model: ollama.embeddingModel(EMBEDDING_MODEL),
            values: chunks,
          })

          await db.delete(schema.paperChunks).where(eq(schema.paperChunks.paperId, paper.id))

          const insertedChunks = await db
            .insert(schema.paperChunks)
            .values(
              chunks.map((content, idx) => ({
                paperId: paper.id,
                content,
                embedding: embeddings[idx],
                chunkIndex: idx,
              }))
            )
            .returning()

          return insertedChunks
        },
        catch: (e) => new Error(`Failed to index paper: ${e}`),
      }),

    indexFileIfNeeded: (projectId: string, filePath: string) =>
      Effect.tryPromise({
        try: async () => {
          if (!filePath.toLowerCase().endsWith(".pdf")) {
            return
          }

          const filename = filePath.split("/").pop() ?? filePath

          const existingPaper = await db.query.papers.findFirst({
            where: (papers, { and, eq: eqOp }) =>
              and(eqOp(papers.projectId, projectId), eqOp(papers.filename, filename)),
          })

          if (existingPaper) {
            const hasChunks = await db.query.paperChunks.findFirst({
              where: eq(schema.paperChunks.paperId, existingPaper.id),
            })
            if (hasChunks) {
              return
            }
          }

          const file = Bun.file(filePath)
          if (!(await file.exists())) {
            return
          }

          const paper =
            existingPaper ??
            (
              await db
                .insert(schema.papers)
                .values({
                  projectId,
                  filename,
                  path: filePath,
                  metadata: { size: file.size, type: "application/pdf", source: "local" },
                })
                .returning()
            )[0]!

          const text = await Bun.$`${PDFTOTEXT_PATH} -layout ${filePath} -`.text()
          if (!text.trim()) {
            return
          }

          const chunks = chunkText(text, CHUNK_SIZE, CHUNK_OVERLAP)
          if (chunks.length === 0) {
            return
          }

          const { embeddings } = await embedMany({
            model: ollama.embeddingModel(EMBEDDING_MODEL),
            values: chunks,
          })

          await db.insert(schema.paperChunks).values(
            chunks.map((content, idx) => ({
              paperId: paper.id,
              content,
              embedding: embeddings[idx],
              chunkIndex: idx,
            }))
          )
        },
        catch: (e) => new Error(`Failed to index file: ${e}`),
      }),

    indexFolder: (projectId: string, folderPath: string, onProgress: (progress: IndexProgress) => void) =>
      Effect.tryPromise({
        try: async () => {
          onProgress({ total: 0, completed: 0, currentFile: null, status: "scanning" })

          const glob = new Bun.Glob("**/*.pdf")
          const pdfFiles: string[] = []
          for await (const file of glob.scan({ cwd: folderPath, absolute: true })) {
            pdfFiles.push(file)
          }

          if (pdfFiles.length === 0) {
            onProgress({ total: 0, completed: 0, currentFile: null, status: "done" })
            return
          }

          onProgress({ total: pdfFiles.length, completed: 0, currentFile: null, status: "indexing" })

          for (let i = 0; i < pdfFiles.length; i++) {
            const filePath = pdfFiles[i]!
            const filename = filePath.split("/").pop() ?? filePath

            onProgress({
              total: pdfFiles.length,
              completed: i,
              currentFile: filename,
              status: "indexing",
            })

            try {
              const existingPaper = await db.query.papers.findFirst({
                where: (papers, { and, eq: eqOp }) =>
                  and(eqOp(papers.projectId, projectId), eqOp(papers.filename, filename)),
              })

              if (existingPaper) {
                const hasChunks = await db.query.paperChunks.findFirst({
                  where: eq(schema.paperChunks.paperId, existingPaper.id),
                })
                if (hasChunks) {
                  continue
                }
              }

              const file = Bun.file(filePath)
              const paper =
                existingPaper ??
                (
                  await db
                    .insert(schema.papers)
                    .values({
                      projectId,
                      filename,
                      path: filePath,
                      metadata: { size: file.size, type: "application/pdf", source: "local" },
                    })
                    .returning()
                )[0]!

              const text = await Bun.$`${PDFTOTEXT_PATH} -layout ${filePath} -`.text()
              if (!text.trim()) continue

              const chunks = chunkText(text, CHUNK_SIZE, CHUNK_OVERLAP)
              if (chunks.length === 0) continue

              const { embeddings } = await embedMany({
                model: ollama.embeddingModel(EMBEDDING_MODEL),
                values: chunks,
              })

              await db.insert(schema.paperChunks).values(
                chunks.map((content, idx) => ({
                  paperId: paper.id,
                  content,
                  embedding: embeddings[idx],
                  chunkIndex: idx,
                }))
              )
            } catch (e) {
              console.error(`Failed to index ${filename}:`, e)
            }
          }

          onProgress({ total: pdfFiles.length, completed: pdfFiles.length, currentFile: null, status: "done" })
        },
        catch: (e) => new Error(`Failed to index folder: ${e}`),
      }),

    isIndexed: (paperId: string) =>
      Effect.tryPromise({
        try: async () => {
          const chunk = await db.query.paperChunks.findFirst({
            where: eq(schema.paperChunks.paperId, paperId),
          })
          return !!chunk
        },
        catch: (e) => new Error(`Failed to check index status: ${e}`),
      }),

    deletePaperIndex: (paperId: string) =>
      Effect.tryPromise({
        try: async () => {
          await db.delete(schema.paperChunks).where(eq(schema.paperChunks.paperId, paperId))
        },
        catch: (e) => new Error(`Failed to delete paper index: ${e}`),
      }),

    searchSimilar: (projectId: string, query: string, limit = 10) =>
      Effect.tryPromise({
        try: async () => {
          const { embeddings } = await embedMany({
            model: ollama.embeddingModel(EMBEDDING_MODEL),
            values: [query],
          })

          const queryEmbedding = embeddings[0]!

          const similarity = sql<number>`1 - (${cosineDistance(schema.paperChunks.embedding, queryEmbedding)})`

          const results = await db
            .select({
              chunk: schema.paperChunks,
              paper: schema.papers,
              similarity,
            })
            .from(schema.paperChunks)
            .innerJoin(schema.papers, eq(schema.paperChunks.paperId, schema.papers.id))
            .where(eq(schema.papers.projectId, projectId))
            .orderBy(desc(similarity))
            .limit(limit)

          return results
        },
        catch: (e) => new Error(`Failed to search: ${e}`),
      }),
  })
)
