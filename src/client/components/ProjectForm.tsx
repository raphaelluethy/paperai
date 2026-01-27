/* @jsxImportSource solid-js */
import { createSignal, Show } from "solid-js"
import { X, Trash2 } from "lucide-solid"
import { projectStore, type Project } from "../stores/projectStore.ts"

type Props = {
  project?: Project
  onClose: () => void
}

export function ProjectForm(props: Props) {
  const [name, setName] = createSignal(props.project?.name ?? "")
  const [description, setDescription] = createSignal(props.project?.description ?? "")
  const [criteria, setCriteria] = createSignal(props.project?.criteria?.join("\n") ?? "")
  const [questions, setQuestions] = createSignal(props.project?.questions?.join("\n") ?? "")
  const [saving, setSaving] = createSignal(false)

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    if (!name().trim()) return

    setSaving(true)
    try {
      const data = {
        name: name().trim(),
        description: description().trim() || undefined,
        criteria: criteria().trim()
          ? criteria().split("\n").filter((c) => c.trim())
          : undefined,
        questions: questions().trim()
          ? questions().split("\n").filter((q) => q.trim())
          : undefined,
      }

      if (props.project) {
        await projectStore.updateProject(props.project.id, data)
      } else {
        const project = await projectStore.createProject(data)
        projectStore.selectProject(project.id)
      }
      props.onClose()
    } catch (e) {
      console.error("Failed to save project:", e)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!props.project) return
    if (!confirm("Are you sure you want to delete this project?")) return

    try {
      await projectStore.deleteProject(props.project.id)
      props.onClose()
    } catch (e) {
      console.error("Failed to delete project:", e)
    }
  }

  const inputClass = "w-full px-3.5 py-3 bg-surface-alt border border-border rounded-xl text-fg text-sm placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-primary-subtle focus:border-primary transition-all"
  const labelClass = "text-sm font-medium text-fg mb-2 block"

  return (
    <div
      class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && props.onClose()}
    >
      <div class="bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in-up">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-semibold text-fg tracking-tight">
            {props.project ? "Edit Project" : "New Project"}
          </h2>
          <button
            class="p-1.5 text-fg-muted hover:text-fg hover:bg-surface-muted rounded-lg transition-colors"
            onClick={props.onClose}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} class="flex flex-col gap-5">
          <div>
            <label class={labelClass}>Project Name</label>
            <input
              type="text"
              class={inputClass}
              value={name()}
              onInput={(e) => setName(e.currentTarget.value)}
              placeholder="Enter project name"
              required
            />
          </div>

          <div>
            <label class={labelClass}>Description</label>
            <textarea
              class={`${inputClass} resize-y min-h-[80px]`}
              value={description()}
              onInput={(e) => setDescription(e.currentTarget.value)}
              placeholder="Describe what this project is about"
            />
          </div>

          <div>
            <label class={labelClass}>Evaluation Criteria</label>
            <textarea
              class={`${inputClass} resize-y min-h-[80px] font-mono text-[0.8rem]`}
              value={criteria()}
              onInput={(e) => setCriteria(e.currentTarget.value)}
              placeholder="Enter criteria (one per line)"
            />
            <p class="text-[0.7rem] text-fg-subtle mt-1.5">
              What makes a paper interesting? One criterion per line.
            </p>
          </div>

          <div>
            <label class={labelClass}>Initial Questions</label>
            <textarea
              class={`${inputClass} resize-y min-h-[80px] font-mono text-[0.8rem]`}
              value={questions()}
              onInput={(e) => setQuestions(e.currentTarget.value)}
              placeholder="Enter questions (one per line)"
            />
            <p class="text-[0.7rem] text-fg-subtle mt-1.5">
              Questions papers should answer. One per line.
            </p>
          </div>

          <div class="flex items-center justify-end gap-3 pt-2">
            <Show when={props.project}>
              <button
                type="button"
                class="mr-auto flex items-center gap-2 px-4 py-2.5 bg-error-subtle text-error font-medium text-sm rounded-xl hover:bg-error hover:text-white transition-all"
                onClick={handleDelete}
              >
                <Trash2 size={14} />
                Delete
              </button>
            </Show>
            <button
              type="button"
              class="px-4 py-2.5 bg-surface-muted hover:bg-surface-emphasis text-fg font-medium text-sm rounded-xl transition-all"
              onClick={props.onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-5 py-2.5 bg-primary hover:brightness-110 text-primary-fg font-medium text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving()}
            >
              {saving() ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
