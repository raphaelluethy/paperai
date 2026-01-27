/* @jsxImportSource solid-js */
import { For, Show, createSignal, createEffect } from "solid-js"
import { Plus, BookOpen, MessageSquare, Trash2, ChevronLeft, ChevronRight, Clock, Trash } from "lucide-solid"
import { projectStore } from "../stores/projectStore.ts"
import { chatStore, type Conversation } from "../stores/chatStore.ts"

type Props = {
  onNewProject: () => void
}

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

export function Sidebar(props: Props) {
  const [isExpanded, setIsExpanded] = createSignal(true)
  const [deletingId, setDeletingId] = createSignal<string | null>(null)

  // Reload chats when project changes
  createEffect(() => {
    const projectId = projectStore.selectedProjectId()
    if (projectId) {
      chatStore.fetchConversations(projectId)
      // Reset to new chat when switching projects
      chatStore.createNewChat()
    }
  })

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  return (
    <>
      {/* Expanded Sidebar */}
      <Show when={isExpanded()}>
        <div class="w-72 bg-surface-alt border-r border-border-muted flex flex-col shrink-0">
          {/* Header */}
          <div class="px-5 py-4 border-b border-border-muted flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <BookOpen size={14} class="text-primary-fg" />
              </div>
              <h1 class="text-sm font-semibold text-fg tracking-tight">PaperAI</h1>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              class="p-1.5 rounded-lg hover:bg-surface-muted text-fg-subtle transition-colors"
              title="Collapse sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          </div>

          {/* Projects Section */}
          <div class="flex-none border-b border-border-muted">
            <div class="px-4 py-2 text-[0.65rem] uppercase tracking-wider font-semibold text-fg-subtle">
              Projects
            </div>
            <div class="px-2 pb-2 max-h-48 overflow-y-auto">
              <Show
                when={projectStore.projects.length > 0}
                fallback={
                  <p class="p-3 text-center text-sm text-fg-subtle">
                    No projects yet
                  </p>
                }
              >
                <For each={projectStore.projects}>
                  {(project) => (
                    <button
                      type="button"
                      class={`w-full text-left px-3 py-2 rounded-lg cursor-pointer mb-0.5 transition-all duration-150 ${
                        projectStore.selectedProjectId() === project.id
                          ? "bg-primary-subtle"
                          : "hover:bg-surface-muted"
                      }`}
                      onClick={() => projectStore.selectProject(project.id)}
                    >
                      <div class={`text-sm font-medium truncate ${
                        projectStore.selectedProjectId() === project.id
                          ? "text-primary"
                          : "text-fg"
                      }`}>
                        {project.name}
                      </div>
                      <div class="text-[0.7rem] text-fg-subtle font-mono mt-0.5">
                        {formatDate(project.createdAt)}
                      </div>
                    </button>
                  )}
                </For>
              </Show>
            </div>
            <div class="px-2 pb-3">
              <button
                type="button"
                class="w-full py-2 bg-surface-muted text-fg font-medium text-sm rounded-lg hover:bg-surface-emphasis transition-all flex items-center justify-center gap-2"
                onClick={props.onNewProject}
              >
                <Plus size={14} />
                <span>New Project</span>
              </button>
            </div>
          </div>

          {/* Chats Section */}
          <div class="flex-1 flex flex-col min-h-0">
            <div class="px-4 py-2 text-[0.65rem] uppercase tracking-wider font-semibold text-fg-subtle flex items-center justify-between">
              <span>Chats</span>
              <Show when={projectStore.selectedProjectId()}>
                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => chatStore.deleteAllConversations()}
                    class="p-1 rounded hover:bg-error/10 hover:text-error text-fg-subtle transition-colors"
                    classList={{ "opacity-50 pointer-events-none": chatStore.conversations.length === 0 }}
                    title="Delete all chats"
                  >
                    <Trash size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={handleNewChat}
                    class="p-1 rounded hover:bg-surface-muted text-fg-subtle transition-colors"
                    title="New chat"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </Show>
            </div>
            
            <div class="flex-1 overflow-y-auto px-2">
              <Show
                when={projectStore.selectedProjectId()}
                fallback={
                  <div class="px-3 py-8 text-center">
                    <p class="text-fg-subtle text-sm">Select a project to view chats</p>
                  </div>
                }
              >
                <Show
                  when={chatStore.conversations.length > 0}
                  fallback={
                    <div class="px-3 py-8 text-center">
                      <div class="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center mx-auto mb-2 text-fg-subtle">
                        <MessageSquare size={16} />
                      </div>
                      <p class="text-fg-subtle text-sm">No conversations yet</p>
                      <p class="text-fg-muted text-xs mt-1">Start a new chat to begin</p>
                    </div>
                  }
                >
                  <div class="space-y-1 pb-2">
                    <For each={chatStore.conversations}>
                      {(conversation) => (
                        <div
                          class={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
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
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </Show>
            </div>
          </div>
        </div>
      </Show>

      {/* Collapsed Sidebar */}
      <Show when={!isExpanded()}>
        <div class="w-14 bg-surface-alt border-r border-border-muted flex flex-col items-center py-4 shrink-0">
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            class="p-2 rounded-lg hover:bg-surface-muted text-fg-subtle transition-colors mb-4"
            title="Expand sidebar"
          >
            <ChevronRight size={20} />
          </button>
          
          <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mb-6">
            <BookOpen size={14} class="text-primary-fg" />
          </div>

          <div class="flex-1 w-full overflow-y-auto px-2 space-y-1">
            <For each={projectStore.projects}>
              {(project) => (
                <button
                  type="button"
                  class={`w-full aspect-square rounded-lg flex items-center justify-center transition-all ${
                    projectStore.selectedProjectId() === project.id
                      ? "bg-primary-subtle text-primary"
                      : "hover:bg-surface-muted text-fg-subtle"
                  }`}
                  onClick={() => projectStore.selectProject(project.id)}
                  title={project.name}
                >
                  <span class="text-xs font-medium">
                    {project.name.slice(0, 2).toUpperCase()}
                  </span>
                </button>
              )}
            </For>
          </div>

          <button
            type="button"
            class="mt-4 p-2 rounded-lg hover:bg-surface-muted text-fg-subtle transition-colors"
            onClick={props.onNewProject}
            title="New Project"
          >
            <Plus size={18} />
          </button>
        </div>
      </Show>
    </>
  )
}
