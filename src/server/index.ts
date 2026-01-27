import { handleProjectsRequest } from "./api/projects.ts"
import { handleFilesRequest } from "./api/files.ts"
import { handleConversationsRequest, createChatWebSocketHandler } from "./api/chat.ts"
import { handleSearchRequest } from "./api/search.ts"
import { handleIndexingRequest } from "./api/indexing.ts"
import type { ServerWebSocket } from "bun"
import { resolve, sep } from "path"

type WebSocketData = {
  projectId: string
  conversationId?: string
  sessionId?: string
}

const wsHandler = createChatWebSocketHandler()

const isDev = Bun.env.NODE_ENV !== "production"
const clientRoot = resolve(import.meta.dir, "..", "..", "dist", "client")
const clientIndex = resolve(clientRoot, "index.html")

function resolveClientPath(pathname: string) {
  const safePath = pathname === "/" ? "/index.html" : pathname
  const filePath = resolve(clientRoot, "." + safePath)
  if (!filePath.startsWith(clientRoot + sep)) return null
  return filePath
}

const server = Bun.serve<WebSocketData>({
  port: 3000,

  async fetch(req, server) {
    const url = new URL(req.url)

    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      })
    }

    if (url.pathname.startsWith("/ws/")) {
      const projectId = url.pathname.split("/")[2]
      if (!projectId) {
        return new Response("Project ID required", { status: 400 })
      }

      const upgraded = server.upgrade(req, {
        data: { projectId } as WebSocketData,
      })

      if (upgraded) {
        return undefined
      }

      return new Response("WebSocket upgrade failed", { status: 500 })
    }

    if (url.pathname.startsWith("/api/projects")) {
      if (url.pathname.includes("/files")) {
        return handleFilesRequest(req)
      }
      if (url.pathname.includes("/conversations")) {
        return handleConversationsRequest(req)
      }
      if (url.pathname.includes("/search")) {
        return handleSearchRequest(req)
      }
      if (url.pathname.includes("/index")) {
        return handleIndexingRequest(req)
      }
      return handleProjectsRequest(req)
    }

    const assetPath = resolveClientPath(url.pathname)
    if (assetPath) {
      const assetFile = Bun.file(assetPath)
      if (await assetFile.exists()) {
        return new Response(assetFile)
      }
    }

    const indexFile = Bun.file(clientIndex)
    if (await indexFile.exists()) {
      return new Response(indexFile, {
        headers: { "Content-Type": "text/html" },
      })
    }

    return new Response(
      isDev
        ? "Client build missing. Run `bun src/client/build.ts --watch`."
        : "Client build missing.",
      { status: 503 }
    )
  },

  websocket: {
    open(ws: ServerWebSocket<WebSocketData>) {
      wsHandler.open(ws)
    },
    message(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {
      wsHandler.message(ws, message)
    },
    close(ws: ServerWebSocket<WebSocketData>) {
      wsHandler.close(ws)
    },
  },
})

console.log(`PaperAI server running at http://localhost:${server.port}${isDev ? " (dev mode)" : ""}`)
