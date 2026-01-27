import { Effect } from "effect"
import { ProjectService, ProjectServiceLive } from "../services/ProjectService.ts"

export async function handleProjectsRequest(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const pathParts = url.pathname.split("/").filter(Boolean)
  const projectId = pathParts[2]

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  }

  const program = Effect.gen(function* () {
    const service = yield* ProjectService

    if (req.method === "GET" && !projectId) {
      const projects = yield* service.list()
      return new Response(JSON.stringify(projects), { headers })
    }

    if (req.method === "GET" && projectId) {
      const project = yield* service.get(projectId)
      if (!project) {
        return new Response(JSON.stringify({ error: "Project not found" }), {
          status: 404,
          headers,
        })
      }
      return new Response(JSON.stringify(project), { headers })
    }

    if (req.method === "POST" && !projectId) {
      const body = yield* Effect.tryPromise(() => req.json())
      const project = yield* service.create(body)
      return new Response(JSON.stringify(project), { status: 201, headers })
    }

    if (req.method === "PUT" && projectId) {
      const body = yield* Effect.tryPromise(() => req.json())
      const project = yield* service.update(projectId, body)
      if (!project) {
        return new Response(JSON.stringify({ error: "Project not found" }), {
          status: 404,
          headers,
        })
      }
      return new Response(JSON.stringify(project), { headers })
    }

    if (req.method === "DELETE" && projectId) {
      const deleted = yield* service.delete(projectId)
      if (!deleted) {
        return new Response(JSON.stringify({ error: "Project not found" }), {
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
      program.pipe(Effect.provide(ProjectServiceLive))
    )
    return result
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers,
    })
  }
}
