/* @jsxImportSource solid-js */
import { createSignal, onMount, onCleanup, Show } from "solid-js"
import { Square, Send } from "lucide-solid"
import { chatStore } from "../stores/chatStore.ts"
import { projectStore } from "../stores/projectStore.ts"
import { MessageList } from "./MessageList.tsx"
import { AgentActivityTree } from "./AgentActivityTree.tsx"

export function ChatInterface() {
  const [input, setInput] = createSignal("")
  let inputRef: HTMLTextAreaElement | undefined

  onMount(() => {
    const projectId = projectStore.selectedProjectId()
    if (projectId) {
      chatStore.connect(projectId)
    }
  })

  onCleanup(() => {
    chatStore.disconnect()
  })

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    const message = input().trim()
    if (!message || chatStore.isProcessing()) return

    chatStore.sendMessage(message)
    setInput("")
    inputRef?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div class="flex flex-1 overflow-hidden">
      <div class="flex flex-1 flex-col min-w-0">
        <MessageList />

        <div class="px-6 py-4 border-t border-border-muted bg-surface shrink-0">
          <div class="max-w-2xl mx-auto">
            <form class="flex items-end gap-3" onSubmit={handleSubmit}>
              <textarea
                ref={inputRef}
                class="flex-1 px-4 py-3 border border-border rounded-xl bg-surface-alt text-fg text-sm resize-none min-h-[48px] max-h-[160px] transition-all duration-150 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-subtle placeholder:text-fg-subtle"
                placeholder={
                  chatStore.isConnected()
                    ? "Ask about your papers..."
                    : "Connecting..."
                }
                value={input()}
                onInput={(e) => setInput(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                disabled={!chatStore.isConnected() || chatStore.isProcessing()}
                rows={1}
              />
              <Show 
                when={chatStore.isProcessing()}
                fallback={
                  <button
                    type="submit"
                    class="h-[48px] w-[48px] rounded-xl bg-primary text-primary-fg flex items-center justify-center hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    disabled={!chatStore.isConnected() || !input().trim()}
                  >
                    <Send size={18} />
                  </button>
                }
              >
                <button
                  type="button"
                  class="h-[48px] px-4 bg-error text-white font-medium text-sm rounded-xl flex items-center gap-2 hover:brightness-110 transition-all shrink-0"
                  onClick={() => chatStore.stopQuery()}
                  title="Stop generation"
                >
                  <Square size={14} />
                  <span>Stop</span>
                </button>
              </Show>
            </form>
          </div>
        </div>
      </div>

      <AgentActivityTree />
    </div>
  )
}
