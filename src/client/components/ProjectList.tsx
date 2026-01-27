/* @jsxImportSource solid-js */
import { For, Show } from "solid-js"
import { Plus, BookOpen } from "lucide-solid"
import { projectStore } from "../stores/projectStore.ts"

type Props = {
  onNewProject: () => void
}

export function ProjectList(props: Props) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div class="w-60 bg-surface-alt border-r border-border-muted flex flex-col shrink-0">
      <div class="px-5 py-5 border-b border-border-muted">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <BookOpen size={14} class="text-primary-fg" />
          </div>
          <h1 class="text-sm font-semibold text-fg tracking-tight">PaperAI</h1>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-2">
        <Show
          when={projectStore.projects.length > 0}
          fallback={
            <p class="p-4 text-center text-sm text-fg-subtle">
              No projects yet
            </p>
          }
        >
          <For each={projectStore.projects}>
            {(project) => (
              <button
                class={`w-full text-left px-3 py-2.5 rounded-lg cursor-pointer mb-0.5 transition-all duration-150 ${
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

      <div class="p-2 border-t border-border-muted">
        <button
          class="w-full py-2.5 bg-surface-muted text-fg font-medium text-sm rounded-lg hover:bg-surface-emphasis transition-all flex items-center justify-center gap-2"
          onClick={props.onNewProject}
        >
          <Plus size={16} />
          <span>New Project</span>
        </button>
      </div>
    </div>
  )
}
