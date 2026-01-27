/* @jsxImportSource solid-js */
import { For, Show, createSignal, createEffect, onCleanup } from "solid-js"
import { FileText, FolderSearch, Search, Zap, Terminal, Wrench, ChevronDown, ChevronRight, Check, X, Circle, MoreHorizontal, Loader2 } from "lucide-solid"
import { chatStore, type AgentActivityNode } from "../stores/chatStore.ts"
import { AgentStatusBar } from "./AgentStatusBar.tsx"

function getToolIcon(name: string) {
  switch (name) {
    case "Read": return <FileText size={13} />
    case "Glob": return <FolderSearch size={13} />
    case "Grep": return <Search size={13} />
    case "Task": return <Zap size={13} />
    case "Bash": return <Terminal size={13} />
    default: return <Wrench size={13} />
  }
}

function formatInput(name: string, input?: Record<string, unknown>): string {
  if (!input) return ""
  if (name === "Read" && input.path) {
    const path = String(input.path)
    const parts = path.split("/")
    return parts[parts.length - 1] || path
  }
  if (name === "Grep" && input.pattern) {
    return `"${String(input.pattern).slice(0, 20)}"`
  }
  if (name === "Task" && input.description) {
    const desc = String(input.description)
    return desc.length > 30 ? desc.slice(0, 30) + "..." : desc
  }
  if (name === "Glob" && input.pattern) {
    return String(input.pattern)
  }
  return ""
}

function formatOutput(output: unknown): string {
  if (output === null || output === undefined) return ""
  if (typeof output === "string") {
    return output.length > 300 ? output.slice(0, 300) + "..." : output
  }
  if (Array.isArray(output)) {
    if (output.length === 0) return "[]"
    if (output.length === 1) return formatOutput(output[0])
    return `[${output.length} items]`
  }
  if (typeof output === "object") {
    const obj = output as Record<string, unknown>
    const text = obj.text || obj.content || obj.result
    if (text && typeof text === "string") {
      return text.length > 300 ? text.slice(0, 300) + "..." : text
    }
    return JSON.stringify(output).slice(0, 150) + "..."
  }
  return String(output)
}

function ToolNode(props: { node: AgentActivityNode; depth?: number }) {
  const [expanded, setExpanded] = createSignal(true)
  const [showDetails, setShowDetails] = createSignal(false)
  const [elapsed, setElapsed] = createSignal(0)

  createEffect(() => {
    if (props.node.status === "running" && props.node.startTime) {
      const interval = setInterval(() => {
        setElapsed(Date.now() - props.node.startTime!)
      }, 100)
      onCleanup(() => clearInterval(interval))
    }
  })

  const depth = () => props.depth ?? 0
  const hasChildren = () => props.node.children && props.node.children.length > 0
  const isSubAgent = () => props.node.name === "Task"

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const getDuration = () => {
    if (props.node.endTime && props.node.startTime) {
      return formatTime(props.node.endTime - props.node.startTime)
    }
    if (props.node.status === "running" && props.node.startTime) {
      return formatTime(Date.now() - props.node.startTime)
    }
    return null
  }

  return (
    <div style={{ "padding-left": `${depth() * 14}px` }}>
      <div
        class={`flex items-center gap-1.5 py-1.5 px-2 rounded-lg text-sm cursor-pointer transition-all duration-150 hover:bg-surface-muted ${props.node.status === "running" ? "bg-success-subtle" : ""}`}
        onClick={() => hasChildren() && setExpanded(!expanded())}
      >
        <Show when={hasChildren()} fallback={<div class="w-3 shrink-0" />}>
          <button class="w-3 h-3 flex items-center justify-center text-fg-muted hover:text-fg">
            {expanded() ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        </Show>

        <span class="text-fg-muted shrink-0">{getToolIcon(props.node.name)}</span>
        <span class="font-medium text-fg text-[0.8rem] truncate max-w-[140px]" title={props.node.name}>{props.node.name}</span>

        <Show when={formatInput(props.node.name, props.node.input)}>
          <span class="text-fg-subtle truncate text-[0.7rem] font-mono flex-1 min-w-0" title={formatInput(props.node.name, props.node.input)}>{formatInput(props.node.name, props.node.input)}</span>
        </Show>

        <div class="ml-auto flex items-center gap-1.5 shrink-0">
          <Show when={getDuration()}>
            <span class="text-[0.65rem] text-fg-muted tabular-nums font-mono">{getDuration()}</span>
          </Show>
          <div class="flex items-center justify-center w-4 h-4">
            <Show when={props.node.status === "running"}>
              <Loader2 size={12} class="text-success animate-spin" />
            </Show>
            <Show when={props.node.status === "done"}>
              <Check size={11} class="text-success" />
            </Show>
            <Show when={props.node.status === "error"}>
              <X size={11} class="text-error" />
            </Show>
            <Show when={props.node.status === "pending"}>
              <Circle size={10} class="text-fg-subtle" />
            </Show>
          </div>
        </div>

        <Show when={props.node.input || props.node.output}>
          <button
            class="w-5 h-5 flex items-center justify-center text-fg-subtle hover:text-fg hover:bg-surface-emphasis rounded shrink-0 transition-colors"
            onClick={(e) => { e.stopPropagation(); setShowDetails(!showDetails()) }}
          >
            <MoreHorizontal size={12} />
          </button>
        </Show>
      </div>

      <Show when={showDetails()}>
        <div class="mt-1 mb-2 p-2.5 bg-surface rounded-lg border border-border-muted text-xs animate-fade-in" style={{ "margin-left": `${24}px` }}>
          <Show when={props.node.input}>
            <div class="mb-2">
              <div class="text-fg-muted font-medium mb-1 text-[0.65rem] uppercase tracking-wider">Input</div>
              <pre class="whitespace-pre-wrap break-all text-fg font-mono text-[0.7rem] leading-relaxed">{JSON.stringify(props.node.input, null, 2)}</pre>
            </div>
          </Show>
          <Show when={props.node.output}>
            <div>
              <div class="text-fg-muted font-medium mb-1 text-[0.65rem] uppercase tracking-wider">Output</div>
              <pre class="whitespace-pre-wrap break-all text-fg font-mono text-[0.7rem] leading-relaxed">{formatOutput(props.node.output)}</pre>
            </div>
          </Show>
        </div>
      </Show>

      <Show when={expanded() && hasChildren()}>
        <div class={isSubAgent() ? "border-l border-border-muted ml-1.5" : ""}>
          <For each={props.node.children}>
            {(child) => <ToolNode node={child} depth={depth() + 1} />}
          </For>
        </div>
      </Show>
    </div>
  )
}

export function AgentActivityTree() {
  return (
    <div class="w-[380px] bg-surface-alt border-l border-border-muted flex flex-col shrink-0">
      <AgentStatusBar />
      
      <div class="flex-1 overflow-y-auto p-2.5">
        <Show
          when={chatStore.agentActivity.length > 0}
          fallback={
            <div class="flex items-center justify-center h-full">
              <Show when={chatStore.isProcessing()}>
                <div class="flex items-center gap-2 text-fg-muted animate-fade-in">
                  <Loader2 size={14} class="animate-spin" />
                  <span class="text-sm">Initializing...</span>
                </div>
              </Show>
              <Show when={!chatStore.isProcessing()}>
                <span class="text-fg-subtle text-sm">Activity will appear here</span>
              </Show>
            </div>
          }
        >
          <div class="flex flex-col gap-0.5">
            <For each={chatStore.agentActivity}>
              {(node) => <ToolNode node={node} />}
            </For>
          </div>
        </Show>
      </div>
    </div>
  )
}
