/* @jsxImportSource solid-js */
import { createSignal, createEffect, onCleanup, Show } from "solid-js"
import { Cpu } from "lucide-solid"
import { chatStore, type AgentActivityNode } from "../stores/chatStore.ts"

export function AgentStatusBar() {
  const [elapsedTime, setElapsedTime] = createSignal(0)
  const [startTime, setStartTime] = createSignal<number | null>(null)

  createEffect(() => {
    if (chatStore.isProcessing()) {
      const now = Date.now()
      setStartTime(now)
      setElapsedTime(0)
      const interval = setInterval(() => {
        const start = startTime()
        if (start) setElapsedTime(Date.now() - start)
      }, 100)
      onCleanup(() => clearInterval(interval))
    } else {
      setStartTime(null)
    }
  })

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const tenths = Math.floor((ms % 1000) / 100)
    return `${seconds}.${tenths}s`
  }

  const getActiveToolCount = () => {
    const count = (nodes: AgentActivityNode[]): number => {
      return nodes.reduce((acc, node) => {
        const childCount = node.children ? count(node.children) : 0
        return acc + (node.status === "running" ? 1 : 0) + childCount
      }, 0)
    }
    return count(chatStore.agentActivity)
  }

  const getState = () => {
    if (!chatStore.isProcessing()) return "idle"
    if (getActiveToolCount() > 0) return "running"
    return "thinking"
  }

  const getStatusText = () => {
    const state = getState()
    if (state === "idle") return "Ready"
    if (state === "thinking") return "Thinking..."
    const count = getActiveToolCount()
    return `Running ${count} tool${count !== 1 ? "s" : ""}`
  }

  return (
    <div class="flex items-center justify-between px-4 py-3 bg-surface-muted border-b border-border-muted">
      <div class="flex items-center gap-2.5">
        <div class="relative w-2.5 h-2.5">
          <div class={`absolute inset-0 rounded-full transition-colors ${
            getState() === "idle" ? "bg-fg-subtle" :
            getState() === "thinking" ? "bg-warning" :
            "bg-success"
          }`} />
          <Show when={getState() !== "idle"}>
            <div class={`absolute -inset-1 rounded-full border animate-pulse-ring ${
              getState() === "thinking" ? "border-warning" : "border-success"
            }`} />
          </Show>
        </div>
        <span class={`text-sm font-medium ${
          getState() === "idle" ? "text-fg-muted" : "text-fg"
        }`}>
          {getStatusText()}
        </span>
      </div>

      <div class="flex items-center gap-3">
        <Show when={chatStore.isProcessing()}>
          <span class="font-mono text-sm font-medium text-primary min-w-[48px] text-right tabular-nums">
            {formatTime(elapsedTime())}
          </span>
        </Show>
        <div class="flex items-center gap-1.5 font-mono text-[0.65rem] text-fg-subtle px-2 py-1 bg-surface-emphasis rounded-md">
          <Cpu size={10} />
          <span>Sonnet</span>
        </div>
      </div>
    </div>
  )
}
