/* @jsxImportSource solid-js */
import { For, Show, createEffect, createSignal } from "solid-js"
import { FileText, Loader2, ChevronDown, ChevronRight, Brain } from "lucide-solid"
import { chatStore } from "../stores/chatStore.ts"
import { Markdown } from "./Markdown.tsx"

export function MessageList() {
  let containerRef: HTMLDivElement | undefined

  const scrollToBottom = () => {
    if (containerRef) {
      containerRef.scrollTop = containerRef.scrollHeight
    }
  }

  createEffect(() => {
    chatStore.messages.length
    scrollToBottom()
  })

  const formatTime = (date?: Date) => {
    if (!date) return ""
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  // Track which thinking sections are expanded
  const [expandedThinking, setExpandedThinking] = createSignal<Set<string>>(new Set())

  const toggleThinking = (messageId: string) => {
    setExpandedThinking(prev => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
      }
      return newSet
    })
  }

  return (
    <div class="flex-1 overflow-y-auto px-6 py-6" ref={containerRef}>
      <Show
        when={chatStore.messages.length > 0}
        fallback={
          <div class="flex flex-col items-center justify-center h-full text-center animate-fade-in-up">
            <div class="w-12 h-12 rounded-xl bg-surface-emphasis flex items-center justify-center mb-4 text-fg-muted">
              <FileText size={22} />
            </div>
            <h2 class="text-base font-semibold text-fg tracking-tight mb-1">Start a conversation</h2>
            <p class="text-fg-subtle text-sm">Ask questions about your uploaded papers</p>
          </div>
        }
      >
        <div class="max-w-3xl mx-auto space-y-5">
          <For each={chatStore.messages}>
            {(message) => (
              <div class="animate-fade-in">
                <div class={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}>
                  <div class="flex items-center gap-2 mb-1.5 px-1">
                    <span class="text-[0.65rem] uppercase tracking-wider font-semibold text-fg-subtle">
                      {message.role === "user" ? "You" : message.role === "assistant" ? "Claude" : "System"}
                    </span>
                    <span class="text-[0.65rem] text-fg-muted">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  
                  {/* Thinking section - collapsible */}
                  <Show when={message.role === "assistant" && message.thinking}>
                    <button
                      onClick={() => toggleThinking(message.id)}
                      class="flex items-center gap-1.5 mb-2 px-3 py-1.5 text-xs font-medium text-fg-subtle bg-surface-emphasis/60 hover:bg-surface-emphasis rounded-lg transition-colors border border-border-muted/50"
                    >
                      <Brain size={12} />
                      <span>Thinking</span>
                      {expandedThinking().has(message.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                    
                    <Show when={expandedThinking().has(message.id)}>
                      <div class="max-w-[90%] mb-3 px-4 py-3 bg-surface-emphasis/30 border border-border-muted/50 rounded-xl text-fg-subtle text-sm overflow-hidden">
                        <div class="text-xs font-medium text-fg-muted mb-2 uppercase tracking-wider">Thinking Process</div>
                        <div class="whitespace-pre-wrap leading-relaxed">
                          {message.thinking}
                        </div>
                      </div>
                    </Show>
                  </Show>
                  
                  <div
                    class={`max-w-[90%] min-w-0 rounded-2xl px-4 py-3 overflow-hidden ${
                      message.role === "user"
                        ? "bg-user-bubble text-user-bubble-fg rounded-br-lg"
                        : message.role === "system"
                        ? "bg-error-subtle text-error border border-error/20 rounded-bl-lg"
                        : "bg-assistant-bubble text-assistant-bubble-fg border border-assistant-bubble-border rounded-bl-lg"
                    }`}
                  >
                    <Show
                      when={message.role === "assistant"}
                      fallback={
                        <div class="text-sm leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere">
                          {message.content}
                        </div>
                      }
                    >
                      <Markdown content={message.content} />
                    </Show>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>

        {/* Thinking indicator */}
        <Show when={chatStore.isThinking()}>
          <div class="max-w-3xl mx-auto mt-6 animate-fade-in">
            <div class="flex items-center gap-3 text-fg-subtle bg-surface-emphasis/50 px-4 py-3 rounded-xl border border-border-muted">
              <Loader2 size={18} class="animate-spin" />
              <div class="flex flex-col gap-0.5">
                <span class="text-sm font-medium">Claude is thinking...</span>
                <span class="text-xs text-fg-muted">Analyzing your papers and planning the response</span>
              </div>
            </div>
          </div>
        </Show>

        {/* Streaming indicator - only show when we have messages and are processing */}
        <Show when={chatStore.isProcessing() && !chatStore.isThinking() && chatStore.messages.length > 0 && chatStore.messages[chatStore.messages.length - 1]?.role === "assistant"}>
          <div class="max-w-3xl mx-auto mt-2 px-4 flex items-center gap-1.5 text-fg-subtle">
            <span class="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            <span class="text-xs">Generating...</span>
          </div>
        </Show>
      </Show>
    </div>
  )
}
