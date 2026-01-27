import { Effect } from "effect"
import { FileService, FileServiceLive } from "../services/FileService.ts"
import { IndexingService, IndexingServiceLive } from "../services/IndexingService.ts"

export async function handleFilesRequest(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const pathParts = url.pathname.split("/").filter(Boolean)
  const projectId = pathParts[2]
  const fileId = pathParts[4]

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

  const program = Effect.gen(function* () {
    const service = yield* FileService

    if (req.method === "GET" && !fileId) {
      const papers = yield* service.listByProject(projectId)
      return new Response(JSON.stringify(papers), { headers })
    }

    if (req.method === "GET" && fileId) {
      const paper = yield* service.get(fileId)
      if (!paper) {
        return new Response(JSON.stringify({ error: "File not found" }), {
          status: 404,
          headers,
        })
      }
      return new Response(JSON.stringify(paper), { headers })
    }

    if (req.method === "POST" && !fileId) {
      const formData = yield* Effect.tryPromise(() => req.formData())
      const file = formData.get("file") as File | null

      if (!file) {
        return new Response(JSON.stringify({ error: "No file provided" }), {
          status: 400,
          headers,
        })
      }

      const paper = yield* service.upload(projectId, file)

      const indexingService = yield* IndexingService
      const filePath = service.getFilePath(paper)
      yield* indexingService.indexPaper(paper, filePath)

      return new Response(JSON.stringify(paper), { status: 201, headers })
    }

    if (req.method === "DELETE" && fileId) {
      const deleted = yield* service.delete(fileId)
      if (!deleted) {
        return new Response(JSON.stringify({ error: "File not found" }), {
          status: 404,
          headers,
        })
      }
      return new Response(JSON.stringify({ success: true }), { headers })
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers,
    })
  })

  try {
    const result = await Effect.runPromise(
      program.pipe(Effect.provide(FileServiceLive), Effect.provide(IndexingServiceLive))
    )
    return result
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers,
    })
  }
}
