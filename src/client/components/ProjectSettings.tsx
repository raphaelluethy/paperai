/* @jsxImportSource solid-js */
import { createSignal, Show } from "solid-js"
import { Save, FolderOpen } from "lucide-solid"
import { projectStore } from "../stores/projectStore.ts"

type Props = {
  onSaved?: () => void
}

export function ProjectSettings(props: Props) {
  const project = () => projectStore.selectedProject

  const [name, setName] = createSignal("")
  const [description, setDescription] = createSignal("")
  const [criteria, setCriteria] = createSignal("")
  const [questions, setQuestions] = createSignal("")
  const [localPath, setLocalPath] = createSignal("")
  const [saving, setSaving] = createSignal(false)

  const initForm = () => {
    const p = project()
    if (p) {
      setName(p.name)
      setDescription(p.description ?? "")
      setCriteria(p.criteria?.join("\n") ?? "")
      setQuestions(p.questions?.join("\n") ?? "")
      setLocalPath(p.localPath ?? "")
    }
  }

  const handleSave = async () => {
    const p = project()
    if (!p) return

    setSaving(true)
    try {
      await projectStore.updateProject(p.id, {
        name: name().trim(),
        description: description().trim() || null,
        criteria: criteria().trim()
          ? criteria().split("\n").filter((c) => c.trim())
          : null,
        questions: questions().trim()
          ? questions().split("\n").filter((q) => q.trim())
          : null,
        localPath: localPath().trim() || null,
      })
      props.onSaved?.()
    } catch (e) {
      console.error("Failed to save:", e)
    } finally {
      setSaving(false)
    }
  }

  initForm()

  const inputClass = "w-full px-3.5 py-3 border border-border rounded-xl bg-surface-alt text-fg text-sm transition-all focus:outline-none focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary-subtle"
  const labelClass = "block text-sm font-medium text-fg mb-2"
  const hintClass = "text-[0.75rem] text-fg-subtle mt-1.5 leading-relaxed"

  return (
    <div class="flex-1 overflow-y-auto p-8">
      <Show
        when={project()}
        fallback={
          <div class="flex items-center justify-center h-full text-fg-muted text-sm">
            Select a project to view settings
          </div>
        }
      >
        <div class="max-w-xl mx-auto">
          <div class="mb-6">
            <label class={labelClass}>Project Name</label>
            <input
              type="text"
              class={inputClass}
              value={name()}
              onInput={(e) => setName(e.currentTarget.value)}
            />
          </div>

          <div class="mb-6">
            <label class={labelClass}>Description</label>
            <textarea
              class={`${inputClass} resize-y min-h-[100px]`}
              value={description()}
              onInput={(e) => setDescription(e.currentTarget.value)}
              placeholder="What is this project about?"
            />
          </div>

          <div class="mb-6">
            <label class={labelClass}>
              <span class="flex items-center gap-2">
                <FolderOpen size={14} class="text-fg-muted" />
                Local Folder Path
              </span>
            </label>
            <input
              type="text"
              class={`${inputClass} font-mono text-[0.8rem]`}
              value={localPath()}
              onInput={(e) => setLocalPath(e.currentTarget.value)}
              placeholder="/path/to/your/papers/folder"
            />
            <p class={hintClass}>
              Point to a local folder containing papers. The agent will have read access to files in this directory.
            </p>
          </div>

          <div class="mb-6">
            <label class={labelClass}>Evaluation Criteria</label>
            <textarea
              class={`${inputClass} font-mono text-[0.8rem] resize-y min-h-[120px]`}
              value={criteria()}
              onInput={(e) => setCriteria(e.currentTarget.value)}
              placeholder="One criterion per line"
            />
            <p class={hintClass}>
              Define what makes a paper interesting or relevant to this project.
            </p>
          </div>

          <div class="mb-6">
            <label class={labelClass}>Research Questions</label>
            <textarea
              class={`${inputClass} font-mono text-[0.8rem] resize-y min-h-[120px]`}
              value={questions()}
              onInput={(e) => setQuestions(e.currentTarget.value)}
              placeholder="One question per line"
            />
            <p class={hintClass}>
              Questions that papers should answer. Claude will use these when analyzing.
            </p>
          </div>

          <div class="mt-8">
            <button
              class="flex items-center gap-2 px-5 py-3 bg-primary text-primary-fg font-medium text-sm rounded-xl hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSave}
              disabled={saving()}
            >
              <Save size={15} />
              {saving() ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </Show>
    </div>
  )
}
