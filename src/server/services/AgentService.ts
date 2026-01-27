import { Context, Effect, Layer, Stream } from "effect"
import { query, type SDKMessage, type SDKResultMessage, type Options } from "@anthropic-ai/claude-agent-sdk"
import type { Project } from "../db/schema.ts"
import { createPaperToolsServer } from "./PaperTools.ts"

export type ToolInput = {
  [key: string]: unknown
}

export type AgentEvent =
  | { type: "init"; sessionId: string }
  | { type: "message"; content: string }
  | { type: "tool_start"; toolName: string; toolUseId: string; parentToolUseId: string | null; input: ToolInput }
  | { type: "tool_progress"; toolName: string; toolUseId: string; parentToolUseId: string | null; elapsedTime: number }
  | { type: "tool_end"; toolUseId: string; result: unknown; isError?: boolean }
  | { type: "result"; result: SDKResultMessage }
  | { type: "error"; error: string }

export class AgentService extends Context.Tag("AgentService")<
  AgentService,
  {
    readonly runQuery: (
      prompt: string,
      project: Project,
      papersDir: string,
      sessionId?: string
    ) => Stream.Stream<AgentEvent>
  }
>() {}

function buildSystemPrompt(project: Project): string {
  let systemPrompt = `You are an AI research assistant helping to analyze academic papers for the project "${project.name}".

${project.description ? `Project Description: ${project.description}\n` : ""}
`

  if (project.criteria && project.criteria.length > 0) {
    systemPrompt += `
Evaluation Criteria:
${project.criteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}
`
  }

  if (project.questions && project.questions.length > 0) {
    systemPrompt += `
Questions to Answer:
${project.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}
`
  }

  systemPrompt += `
When analyzing papers:
1. Use semantic_search to find relevant passages across all indexed papers - this is your primary research tool
2. Use list_indexed_papers to see which papers are available and indexed
3. If a paper isn't indexed, use index_paper to index it first (provide the full path)
4. Use the Read tool to read specific PDF files when you need the full content
5. Use the Glob tool to find PDF files (pattern: "*.pdf" or "**/*.pdf")
6. For complex analysis involving multiple papers, use the Task tool to spawn sub-agents for parallel analysis
7. Provide structured, evidence-based responses with references to specific papers

Available tools: semantic_search, index_paper, check_indexed, list_indexed_papers, Read, Glob, Grep, Task, Bash
`

  return systemPrompt
}

type ContentBlock = { type: string; text?: string; id?: string; name?: string; input?: ToolInput }
type ToolUseBlock = ContentBlock & { type: "tool_use"; id: string; name: string; input: ToolInput }

function extractTextContent(message: SDKMessage): string | null {
  if (message.type === "assistant") {
    const textBlocks = message.message.content.filter(
      (block: ContentBlock): block is ContentBlock & { type: "text"; text: string } => block.type === "text"
    )
    if (textBlocks.length > 0) {
      return textBlocks.map((b: { text: string }) => b.text).join("\n")
    }
  }
  return null
}

function extractToolUseBlocks(message: SDKMessage): ToolUseBlock[] {
  if (message.type === "assistant") {
    return message.message.content.filter(
      (block: ContentBlock): block is ToolUseBlock => block.type === "tool_use"
    )
  }
  return []
}

type ToolResultBlock = { type: "tool_result"; tool_use_id: string; content: unknown; is_error?: boolean }

function extractToolResult(message: SDKMessage): { toolUseId: string; result: unknown; isError?: boolean } | null {
  if (message.type === "user" && message.message?.content) {
    const content = message.message.content as ToolResultBlock | ToolResultBlock[]
    const blocks = Array.isArray(content) ? content : [content]
    const resultBlock = blocks.find((b): b is ToolResultBlock => b.type === "tool_result")
    if (resultBlock) {
      return {
        toolUseId: resultBlock.tool_use_id,
        result: resultBlock.content,
        isError: resultBlock.is_error
      }
    }
  }
  return null
}

export const AgentServiceLive = Layer.succeed(
  AgentService,
  AgentService.of({
    runQuery: (prompt, project, papersDir, sessionId) =>
      Stream.async<AgentEvent>((emit) => {
        const abortController = new AbortController()
        const paperToolsServer = createPaperToolsServer(project.id)

        const options: Options = {
          cwd: papersDir,
          model: "opus",
          systemPrompt: buildSystemPrompt(project),
          abortController,
          allowedTools: [
            "Read",
            "Glob",
            "Grep",
            "Task",
            "Bash",
            "mcp__paper-tools__semantic_search",
            "mcp__paper-tools__index_paper",
            "mcp__paper-tools__check_indexed",
            "mcp__paper-tools__list_indexed_papers",
          ],
          permissionMode: "bypassPermissions",
          allowDangerouslySkipPermissions: true,
          resume: sessionId,
          persistSession: true,
          tools: ["Read", "Glob", "Grep", "Task", "Bash"],
          mcpServers: {
            "paper-tools": paperToolsServer,
          },
          agents: {
            explorer: {
              description: "Lightweight explorer agent for searching and reading files, finding patterns, and gathering information from the codebase",
              prompt: "You are a fast, efficient explorer agent. Your job is to search files, read content, and gather information. Be concise and return only the relevant findings.",
              tools: ["Read", "Glob", "Grep", "Bash"],
              model: "haiku",
            },
          },
        }

        const runAgent = async () => {
          try {
            const queryResult = query({ prompt, options })

            for await (const message of queryResult) {
              if (message.type === "system" && message.subtype === "init") {
                emit.single({ type: "init", sessionId: message.session_id })
              } else if (message.type === "assistant") {
                const text = extractTextContent(message)
                if (text) {
                  emit.single({ type: "message", content: text })
                }
                // Emit tool_start events for each tool_use block
                const toolUseBlocks = extractToolUseBlocks(message)
                for (const block of toolUseBlocks) {
                  emit.single({
                    type: "tool_start",
                    toolName: block.name,
                    toolUseId: block.id,
                    parentToolUseId: message.parent_tool_use_id,
                    input: block.input,
                  })
                }
              } else if (message.type === "user") {
                // Check for tool results
                const toolResult = extractToolResult(message)
                if (toolResult) {
                  emit.single({
                    type: "tool_end",
                    toolUseId: toolResult.toolUseId,
                    result: toolResult.result,
                    isError: toolResult.isError,
                  })
                }
              } else if (message.type === "tool_progress") {
                emit.single({
                  type: "tool_progress",
                  toolName: message.tool_name,
                  toolUseId: message.tool_use_id,
                  parentToolUseId: message.parent_tool_use_id,
                  elapsedTime: message.elapsed_time_seconds,
                })
              } else if (message.type === "result") {
                emit.single({ type: "result", result: message })
                emit.end()
              }
            }
          } catch (error) {
            emit.single({
              type: "error",
              error: error instanceof Error ? error.message : String(error),
            })
            emit.end()
          }
        }

        runAgent()

        return Effect.sync(() => {
          abortController.abort()
        })
      }),
  })
)
