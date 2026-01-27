/* @jsxImportSource solid-js */
import { For, Show, createSignal } from "solid-js"
import { Plus, Trash2, MessageSquare, Clock } from "lucide-solid"
import { chatStore, type Conversation } from "../stores/chatStore.ts"
import { projectStore } from "../stores/projectStore.ts"

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function ChatHistory() {
  const [deletingId, setDeletingId] = createSignal<string | null>(null)

  const handleNewChat = () => {
    chatStore.createNewChat()
  }

  const handleSelectConversation = (conversation: Conversation) => {
    if (chatStore.currentConversationId() === conversation.id) return
    chatStore.loadConversation(conversation.id)
  }

  const handleDelete = async (e: Event, conversationId: string) => {
    e.stopPropagation()
    if (!confirm("Delete this conversation?")) return
    setDeletingId(conversationId)
    await chatStore.deleteConversation(conversationId)
    setDeletingId(null)
  }

  return (
    <div class="w-64 border-r border-border-muted bg-surface-alt flex flex-col shrink-0">
      <div class="p-4 border-b border-border-muted">
        <button
          type="button"
          onClick={handleNewChat}
          class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-fg rounded-xl font-medium text-sm hover:brightness-110 transition-all"
        >
          <Plus size={16} />
          <span>New Chat</span>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto py-2">
        <Show
          when={chatStore.conversations.length > 0}
          fallback={
            <div class="px-4 py-8 text-center">
              <div class="w-12 h-12 rounded-xl bg-surface-muted flex items-center justify-center mx-auto mb-3 text-fg-subtle">
                <MessageSquare size={20} />
              </div>
              <p class="text-fg-subtle text-sm">No conversations yet</p>
              <p class="text-fg-muted text-xs mt-1">Start a new chat to begin</p>
            </div>
          }
        >
          <div class="space-y-1 px-2">
            <For each={chatStore.conversations}>
              {(conversation) => (
                <div
                  class={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                    chatStore.currentConversationId() === conversation.id
                      ? "bg-surface-emphasis text-fg"
                      : "hover:bg-surface-muted text-fg-subtle"
                  }`}
                  onClick={() => handleSelectConversation(conversation)}
                >
                  <MessageSquare size={14} class="shrink-0 opacity-60" />
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium truncate">
                      {conversation.title || "New Chat"}
                    </p>
                    <p class="text-xs opacity-50 flex items-center gap-1">
                      <Clock size={10} />
                      {formatRelativeTime(conversation.updatedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, conversation.id)}
                    disabled={deletingId() === conversation.id}
                    class={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-error/10 hover:text-error transition-all ${
                      deletingId() === conversation.id ? "opacity-50" : ""
                    }`}
                    title="Delete conversation"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  )
}
