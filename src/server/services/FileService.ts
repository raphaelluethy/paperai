import { Context, Effect, Layer } from "effect"
import { db, schema } from "../db/index.ts"
import { eq } from "drizzle-orm"
import type { Paper } from "../db/schema.ts"
import { join } from "path"

const PAPERS_DIR = Bun.env.PAPERS_DIR ?? "./papers"

export class FileService extends Context.Tag("FileService")<
  FileService,
  {
    readonly listByProject: (projectId: string) => Effect.Effect<Paper[], Error>
    readonly get: (id: string) => Effect.Effect<Paper | undefined, Error>
    readonly upload: (projectId: string, file: File) => Effect.Effect<Paper, Error>
    readonly delete: (id: string) => Effect.Effect<boolean, Error>
    readonly getProjectDir: (projectId: string) => string
    readonly getFilePath: (paper: Paper) => string
  }
>() {}

export const FileServiceLive = Layer.succeed(
  FileService,
  FileService.of({
    listByProject: (projectId: string) =>
      Effect.tryPromise({
        try: () =>
          db.query.papers.findMany({
            where: eq(schema.papers.projectId, projectId),
            orderBy: (papers, { desc }) => [desc(papers.uploadedAt)],
          }),
        catch: (e) => new Error(`Failed to list papers: ${e}`),
      }),

    get: (id: string) =>
      Effect.tryPromise({
        try: () =>
          db.query.papers.findFirst({
            where: eq(schema.papers.id, id),
          }),
        catch: (e) => new Error(`Failed to get paper: ${e}`),
      }),

    upload: (projectId: string, file: File) =>
      Effect.tryPromise({
        try: async () => {
          const projectDir = join(PAPERS_DIR, projectId)
          await Bun.$`mkdir -p ${projectDir}`.quiet()

          const filename = file.name
          const relativePath = join(projectId, filename)
          const fullPath = join(PAPERS_DIR, relativePath)

          await Bun.write(fullPath, file)

          const [paper] = await db
            .insert(schema.papers)
            .values({
              projectId,
              filename,
              path: relativePath,
              metadata: {
                size: file.size,
                type: file.type,
              },
            })
            .returning()

          return paper!
        },
        catch: (e) => new Error(`Failed to upload paper: ${e}`),
      }),

    delete: (id: string) =>
      Effect.tryPromise({
        try: async () => {
          const paper = await db.query.papers.findFirst({
            where: eq(schema.papers.id, id),
          })

          if (!paper) return false

          const fullPath = join(PAPERS_DIR, paper.path)
          const file = Bun.file(fullPath)
          if (await file.exists()) {
            await Bun.$`rm ${fullPath}`.quiet()
          }

          const result = await db.delete(schema.papers).where(eq(schema.papers.id, id)).returning()
          return result.length > 0
        },
        catch: (e) => new Error(`Failed to delete paper: ${e}`),
      }),

    getProjectDir: (projectId: string) => join(PAPERS_DIR, projectId),

    getFilePath: (paper: Paper) => join(PAPERS_DIR, paper.path),
  })
)
