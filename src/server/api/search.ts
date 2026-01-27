import { Effect } from "effect"
import { IndexingService, IndexingServiceLive } from "../services/IndexingService.ts"

export async function handleSearchRequest(req: Request): Promise<Response> {
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

  const program = Effect.gen(function* () {
    const body = yield* Effect.tryPromise(() => req.json() as Promise<{ query: string; limit?: number }>)

    if (!body.query) {
      return new Response(JSON.stringify({ error: "Query required" }), {
        status: 400,
        headers,
      })
    }

    const indexingService = yield* IndexingService
    const results = yield* indexingService.searchSimilar(projectId, body.query, body.limit ?? 10)

    return new Response(
      JSON.stringify(
        results.map((r) => ({
          paperId: r.paper.id,
          paperFilename: r.paper.filename,
          content: r.chunk.content,
          chunkIndex: r.chunk.chunkIndex,
          similarity: r.similarity,
        }))
      ),
      { headers }
    )
  })

  try {
    const result = await Effect.runPromise(program.pipe(Effect.provide(IndexingServiceLive)))
    return result
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers,
    })
  }
}
