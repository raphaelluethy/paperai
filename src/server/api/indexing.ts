import { Effect } from "effect"
import { IndexingService, IndexingServiceLive, type IndexProgress } from "../services/IndexingService.ts"
import { db, schema } from "../db/index.ts"
import { eq } from "drizzle-orm"

export async function handleIndexingRequest(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const pathParts = url.pathname.split("/").filter(Boolean)
  const projectId = pathParts[2]

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  }

  if (!projectId) {
    return new Response(JSON.stringify({ error: "Project ID required" }), {
      status: 400,
      headers,
    })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers,
    })
  }

  const project = await db.query.projects.findFirst({
    where: eq(schema.projects.id, projectId),
  })

  if (!project) {
    return new Response(JSON.stringify({ error: "Project not found" }), {
      status: 404,
      headers,
    })
  }

  if (!project.localPath) {
    return new Response(JSON.stringify({ error: "No local path configured for this project" }), {
      status: 400,
      headers,
    })
  }

  const folderPath = project.localPath

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      const sendProgress = (progress: IndexProgress) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`))
      }

      const program = Effect.gen(function* () {
        const indexingService = yield* IndexingService
        yield* indexingService.indexFolder(projectId, folderPath, sendProgress)
      })

      try {
        await Effect.runPromise(program.pipe(Effect.provide(IndexingServiceLive)))
      } catch (error) {
        sendProgress({
          total: 0,
          completed: 0,
          currentFile: null,
          status: "error",
          error: String(error),
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  })
}
