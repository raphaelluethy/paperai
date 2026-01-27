/* @jsxImportSource solid-js */
import { For, Show, createEffect } from "solid-js"
import { FileText } from "lucide-solid"
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
                  </div>
                  <div
                    class={`max-w-[90%] rounded-2xl px-4 py-3 overflow-hidden ${
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
      </Show>
    </div>
  )
}
