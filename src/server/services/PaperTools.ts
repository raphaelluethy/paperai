import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk"
import { z } from "zod"
import { embedMany } from "ai"
import { ollama } from "ollama-ai-provider-v2"
import { db, schema } from "../db/index.ts"
import { eq, sql, cosineDistance, desc } from "drizzle-orm"

const PDFTOTEXT_PATH = "/opt/homebrew/bin/pdftotext"
const EMBEDDING_MODEL = "nomic-embed-text"
const CHUNK_SIZE = 512
const CHUNK_OVERLAP = 50

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

export function createPaperToolsServer(projectId: string) {
  return createSdkMcpServer({
    name: "paper-tools",
    version: "1.0.0",
    tools: [
      tool(
        "semantic_search",
        "Search across all indexed papers using semantic similarity. Use this to find relevant passages based on meaning, not just keywords. Returns the most relevant chunks from papers along with their source.",
        {
          query: z.string().describe("The search query - describe what you're looking for"),
          limit: z.number().optional().default(10).describe("Maximum number of results to return"),
        },
        async (args) => {
          try {
            const { embeddings } = await embedMany({
              model: ollama.embeddingModel(EMBEDDING_MODEL),
              values: [args.query],
            })

            const queryEmbedding = embeddings[0]!
            const similarity = sql<number>`1 - (${cosineDistance(schema.paperChunks.embedding, queryEmbedding)})`

            const results = await db
              .select({
                content: schema.paperChunks.content,
                filename: schema.papers.filename,
                chunkIndex: schema.paperChunks.chunkIndex,
                similarity,
              })
              .from(schema.paperChunks)
              .innerJoin(schema.papers, eq(schema.paperChunks.paperId, schema.papers.id))
              .where(eq(schema.papers.projectId, projectId))
              .orderBy(desc(similarity))
              .limit(args.limit ?? 10)

            if (results.length === 0) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: "No indexed papers found. Use index_paper to index PDF files first.",
                  },
                ],
              }
            }

            const formattedResults = results
              .map(
                (r, i) =>
                  `[${i + 1}] ${r.filename} (chunk ${r.chunkIndex}, similarity: ${(r.similarity * 100).toFixed(1)}%)\n${r.content}`
              )
              .join("\n\n---\n\n")

            return {
              content: [
                {
                  type: "text" as const,
                  text: `Found ${results.length} relevant passages:\n\n${formattedResults}`,
                },
              ],
            }
          } catch (error) {
            return {
              content: [{ type: "text" as const, text: `Search failed: ${error}` }],
            }
          }
        }
      ),

      tool(
        "index_paper",
        "Index a PDF file for semantic search. This extracts text, chunks it, and creates embeddings. Use this before searching if a paper hasn't been indexed yet.",
        {
          file_path: z.string().describe("Absolute path to the PDF file to index"),
        },
        async (args) => {
          try {
            const filePath = args.file_path
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
                return {
                  content: [{ type: "text" as const, text: `Paper "${filename}" is already indexed.` }],
                }
              }
            }

            const file = Bun.file(filePath)
            if (!(await file.exists())) {
              return {
                content: [{ type: "text" as const, text: `File not found: ${filePath}` }],
              }
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
              return {
                content: [{ type: "text" as const, text: `Could not extract text from ${filename}` }],
              }
            }

            const chunks = chunkText(text, CHUNK_SIZE, CHUNK_OVERLAP)
            if (chunks.length === 0) {
              return {
                content: [{ type: "text" as const, text: `No text chunks extracted from ${filename}` }],
              }
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

            return {
              content: [
                {
                  type: "text" as const,
                  text: `Successfully indexed "${filename}": ${chunks.length} chunks created.`,
                },
              ],
            }
          } catch (error) {
            return {
              content: [{ type: "text" as const, text: `Indexing failed: ${error}` }],
            }
          }
        }
      ),

      tool(
        "check_indexed",
        "Check if a paper has been indexed for semantic search.",
        {
          filename: z.string().describe("The filename to check (e.g., 'paper.pdf')"),
        },
        async (args) => {
          try {
            const paper = await db.query.papers.findFirst({
              where: (papers, { and, eq: eqOp }) =>
                and(eqOp(papers.projectId, projectId), eqOp(papers.filename, args.filename)),
            })

            if (!paper) {
              return {
                content: [{ type: "text" as const, text: `Paper "${args.filename}" not found in database.` }],
              }
            }

            const chunkCount = await db
              .select({ count: sql<number>`count(*)` })
              .from(schema.paperChunks)
              .where(eq(schema.paperChunks.paperId, paper.id))

            const count = chunkCount[0]?.count ?? 0

            if (count > 0) {
              return {
                content: [
                  { type: "text" as const, text: `Paper "${args.filename}" is indexed with ${count} chunks.` },
                ],
              }
            } else {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: `Paper "${args.filename}" exists but has no index. Use index_paper to index it.`,
                  },
                ],
              }
            }
          } catch (error) {
            return {
              content: [{ type: "text" as const, text: `Check failed: ${error}` }],
            }
          }
        }
      ),

      tool(
        "list_indexed_papers",
        "List all papers that have been indexed for semantic search in this project.",
        {},
        async () => {
          try {
            const papers = await db.query.papers.findMany({
              where: eq(schema.papers.projectId, projectId),
              with: {
                chunks: true,
              },
            })

            if (papers.length === 0) {
              return {
                content: [{ type: "text" as const, text: "No papers found in this project." }],
              }
            }

            const list = papers
              .map((p) => {
                const chunkCount = p.chunks?.length ?? 0
                const status = chunkCount > 0 ? `✓ indexed (${chunkCount} chunks)` : "✗ not indexed"
                return `- ${p.filename}: ${status}`
              })
              .join("\n")

            return {
              content: [{ type: "text" as const, text: `Papers in project:\n${list}` }],
            }
          } catch (error) {
            return {
              content: [{ type: "text" as const, text: `List failed: ${error}` }],
            }
          }
        }
      ),
    ],
  })
}
