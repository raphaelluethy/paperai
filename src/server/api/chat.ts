import { Effect, Stream } from "effect"
import { ProjectService, ProjectServiceLive } from "../services/ProjectService.ts"
import { FileService, FileServiceLive } from "../services/FileService.ts"
import { AgentService, AgentServiceLive, type AgentEvent } from "../services/AgentService.ts"
import { db, schema } from "../db/index.ts"
import { eq, sql } from "drizzle-orm"
import type { ServerWebSocket } from "bun"

type WebSocketData = {
  projectId: string
  conversationId?: string
  sessionId?: string
}

export function createChatWebSocketHandler() {
  return {
    open(ws: ServerWebSocket<WebSocketData>) {
      console.log(`WebSocket opened for project: ${ws.data.projectId}`)
    },

    async message(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {
      try {
        const data = JSON.parse(message.toString())

        if (data.type === "chat") {
          await handleChatMessage(ws, data.content)
        }
      } catch (error) {
        ws.send(
          JSON.stringify({
            type: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          })
        )
      }
    },

    close(ws: ServerWebSocket<WebSocketData>) {
      console.log(`WebSocket closed for project: ${ws.data.projectId}`)
    },
  }
}

async function handleChatMessage(
  ws: ServerWebSocket<WebSocketData>,
  content: string
) {
  const { projectId, sessionId } = ws.data

  const program = Effect.gen(function* () {
    const projectService = yield* ProjectService
    const fileService = yield* FileService
    const agentService = yield* AgentService

    const project = yield* projectService.get(projectId)
    if (!project) {
      ws.send(JSON.stringify({ type: "error", error: "Project not found" }))
      return
    }

    // Use localPath if set, otherwise use the default project directory
    const papersDir = project.localPath || fileService.getProjectDir(projectId)

    let conversationId = ws.data.conversationId
    if (!conversationId) {
      // Generate title from first 50 chars of first message
      const title = content.length > 50 ? content.slice(0, 50) + "..." : content
      const [conversation] = yield* Effect.tryPromise(() =>
        db
          .insert(schema.conversations)
          .values({
            projectId,
            sessionId: sessionId ?? null,
            title,
          })
          .returning()
      )
      conversationId = conversation!.id
      ws.data.conversationId = conversationId
    } else {
      // Update the updatedAt timestamp for existing conversation
      yield* Effect.tryPromise(() =>
        db
          .update(schema.conversations)
          .set({ updatedAt: sql`now()` })
          .where(eq(schema.conversations.id, conversationId!))
      )
    }

    yield* Effect.tryPromise(() =>
      db.insert(schema.messages).values({
        conversationId: conversationId!,
        role: "user",
        content,
      })
    )

    const eventStream = agentService.runQuery(content, project, papersDir, sessionId)

    let assistantContent = ""
    const agentActivity: AgentActivityNode[] = []

    yield* Stream.runForEach(eventStream, (event) =>
      Effect.sync(() => {
        switch (event.type) {
          case "init":
            ws.data.sessionId = event.sessionId
            ws.send(JSON.stringify({ type: "session", sessionId: event.sessionId }))
            break

          case "message":
            assistantContent += event.content
            ws.send(JSON.stringify({ type: "message", content: event.content }))
            break

          case "tool_start":
            handleToolStart(agentActivity, event)
            ws.send(
              JSON.stringify({
                type: "agent_activity",
                activity: agentActivity,
              })
            )
            break

          case "tool_progress":
            handleToolProgress(agentActivity, event)
            ws.send(
              JSON.stringify({
                type: "agent_activity",
                activity: agentActivity,
              })
            )
            break

          case "tool_end":
            handleToolEnd(agentActivity, event)
            ws.send(
              JSON.stringify({
                type: "agent_activity",
                activity: agentActivity,
              })
            )
            break

          case "result":
            ws.send(
              JSON.stringify({
                type: "result",
                result: {
                  success: event.result.subtype === "success",
                  cost: event.result.total_cost_usd,
                  turns: event.result.num_turns,
                },
              })
            )
            break

          case "error":
            ws.send(JSON.stringify({ type: "error", error: event.error }))
            break
        }
      })
    )

    if (assistantContent) {
      yield* Effect.tryPromise(() =>
        db.insert(schema.messages).values({
          conversationId: conversationId!,
          role: "assistant",
          content: assistantContent,
          agentActivity: agentActivity.length > 0 ? agentActivity : null,
        })
      )
    }
  })

  await Effect.runPromise(
    program.pipe(
      Effect.provide(ProjectServiceLive),
      Effect.provide(FileServiceLive),
      Effect.provide(AgentServiceLive)
    )
  ).catch((error) => {
    ws.send(JSON.stringify({ type: "error", error: String(error) }))
  })
}

type AgentActivityNode = {
  id: string
  name: string
  status: "pending" | "running" | "done" | "error"
  description?: string
  input?: Record<string, unknown>
  output?: unknown
  startTime?: number
  endTime?: number
  children?: AgentActivityNode[]
}

function findNode(
  nodes: AgentActivityNode[],
  id: string
): AgentActivityNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNode(node.children, id)
      if (found) return found
    }
  }
  return null
}

function formatToolInput(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case "Read":
      return `Reading: ${input.file_path || input.path || "file"}`
    case "Glob":
      return `Pattern: ${input.pattern || "*"}`
    case "Grep":
      return `Searching: "${input.pattern || ""}"`
    case "Bash":
      return `$ ${(input.command as string)?.slice(0, 60) || "command"}${(input.command as string)?.length > 60 ? "..." : ""}`
    case "Task":
      return `${input.description || "Sub-task"}`
    default:
      return Object.keys(input).slice(0, 2).map(k => `${k}: ${String(input[k]).slice(0, 30)}`).join(", ")
  }
}

function handleToolStart(
  activity: AgentActivityNode[],
  event: { toolName: string; toolUseId: string; parentToolUseId: string | null; input: Record<string, unknown> }
) {
  const existingNode = findNode(activity, event.toolUseId)
  if (existingNode) {
    existingNode.input = event.input
    existingNode.description = formatToolInput(event.toolName, event.input)
    return
  }

  const newNode: AgentActivityNode = {
    id: event.toolUseId,
    name: event.toolName === "Task" ? "Sub-Agent" : event.toolName,
    status: "running",
    description: formatToolInput(event.toolName, event.input),
    input: event.input,
    startTime: Date.now(),
    children: [],
  }

  if (event.parentToolUseId) {
    const parentNode = findNode(activity, event.parentToolUseId)
    if (parentNode) {
      if (!parentNode.children) parentNode.children = []
      parentNode.children.push(newNode)
      return
    }
  }

  activity.push(newNode)
}

function handleToolProgress(
  activity: AgentActivityNode[],
  event: { toolName: string; toolUseId: string; parentToolUseId: string | null; elapsedTime: number }
) {
  const existingNode = findNode(activity, event.toolUseId)
  if (existingNode) {
    existingNode.status = "running"
    const baseDesc = existingNode.input ? formatToolInput(event.toolName, existingNode.input) : ""
    existingNode.description = baseDesc ? `${baseDesc} (${event.elapsedTime.toFixed(1)}s)` : `Running for ${event.elapsedTime.toFixed(1)}s`
    return
  }

  // Create node if it doesn't exist (fallback for when tool_start wasn't received)
  const newNode: AgentActivityNode = {
    id: event.toolUseId,
    name: event.toolName === "Task" ? "Sub-Agent" : event.toolName,
    status: "running",
    description: `Running for ${event.elapsedTime.toFixed(1)}s`,
    startTime: Date.now() - event.elapsedTime * 1000,
    children: [],
  }

  if (event.parentToolUseId) {
    const parentNode = findNode(activity, event.parentToolUseId)
    if (parentNode) {
      if (!parentNode.children) parentNode.children = []
      parentNode.children.push(newNode)
      return
    }
  }

  activity.push(newNode)
}

function handleToolEnd(
  activity: AgentActivityNode[],
  event: { toolUseId: string; result: unknown; isError?: boolean }
) {
  const node = findNode(activity, event.toolUseId)
  if (node) {
    node.status = event.isError ? "error" : "done"
    node.output = event.result
    node.endTime = Date.now()

    // Format output for display
    const elapsed = node.startTime ? ((node.endTime - node.startTime) / 1000).toFixed(1) : "?"
    const inputDesc = node.input ? formatToolInput(node.name === "Sub-Agent" ? "Task" : node.name, node.input) : ""
    node.description = `${inputDesc} (${elapsed}s)`
  }
}

export async function handleConversationsRequest(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const pathParts = url.pathname.split("/").filter(Boolean)
  const projectId = pathParts[2]
  const conversationId = pathParts[4]

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

  if (req.method === "GET" && !conversationId) {
    const conversations = await db.query.conversations.findMany({
      where: eq(schema.conversations.projectId, projectId),
      orderBy: (conversations, { desc }) => [desc(conversations.updatedAt)],
    })
    return new Response(JSON.stringify(conversations), { headers })
  }

  if (req.method === "GET" && conversationId) {
    const conversation = await db.query.conversations.findFirst({
      where: eq(schema.conversations.id, conversationId),
      with: {
        messages: {
          orderBy: (messages, { asc }) => [asc(messages.createdAt)],
        },
      },
    })
    if (!conversation) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 404,
        headers,
      })
    }
    return new Response(JSON.stringify(conversation), { headers })
  }

  if (req.method === "DELETE" && conversationId) {
    await db.delete(schema.conversations).where(eq(schema.conversations.id, conversationId))
    return new Response(JSON.stringify({ success: true }), { headers })
  }

  if (req.method === "DELETE" && !conversationId) {
    await db.delete(schema.conversations).where(eq(schema.conversations.projectId, projectId))
    return new Response(JSON.stringify({ success: true }), { headers })
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers,
  })
}
