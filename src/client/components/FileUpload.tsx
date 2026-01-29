/* @jsxImportSource solid-js */
import { createSignal, For, Show } from "solid-js"
import { Upload, FileText, Trash2, Loader2 } from "lucide-solid"
import { projectStore } from "../stores/projectStore.ts"

export function FileUpload() {
  const [isDragover, setIsDragover] = createSignal(false)
  const [uploading, setUploading] = createSignal(false)

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault()
    setIsDragover(false)

    const projectId = projectStore.selectedProjectId()
    if (!projectId) return

    const files = e.dataTransfer?.files
    if (!files) return

    await uploadFiles(projectId, files)
  }

  const handleFileInput = async (e: Event) => {
    const projectId = projectStore.selectedProjectId()
    if (!projectId) return

    const input = e.currentTarget as HTMLInputElement
    const files = input.files
    if (!files) return

    await uploadFiles(projectId, files)
    input.value = ""
  }

  const uploadFiles = async (projectId: string, files: FileList) => {
    setUploading(true)
    try {
      for (const file of files) {
        if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
          await projectStore.uploadPaper(projectId, file)
        }
      }
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (paperId: string) => {
    const projectId = projectStore.selectedProjectId()
    if (!projectId) return

    if (!confirm("Are you sure you want to delete this file?")) return
    await projectStore.deletePaper(projectId, paperId)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div class="flex-1 overflow-y-auto p-8">
      <div class="mx-auto max-w-xl">
        <div
          class={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-all duration-200 ${
            isDragover()
              ? "border-primary bg-primary-subtle"
              : "border-border hover:border-primary hover:bg-surface-alt"
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragover(true)
          }}
          onDragLeave={() => setIsDragover(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <Show 
            when={!uploading()} 
            fallback={
              <div class="flex flex-col items-center gap-3 text-fg-muted">
                <Loader2 size={24} class="animate-spin" />
                <p class="text-sm font-medium">Uploading...</p>
              </div>
            }
          >
            <div class="w-12 h-12 rounded-xl bg-surface-muted flex items-center justify-center mb-4 text-fg-subtle">
              <Upload size={22} />
            </div>
            <p class="text-fg font-medium text-sm">Drop PDF files here</p>
            <p class="mt-1 text-sm text-fg-subtle">or click to browse</p>
          </Show>
          <input
            id="file-input"
            type="file"
            accept=".pdf"
            multiple
            class="hidden"
            onChange={handleFileInput}
          />
        </div>

        <div class="mt-8 flex flex-col gap-2">
          <Show
            when={projectStore.papers.length > 0}
            fallback={
              <p class="text-center text-fg-subtle text-sm py-8">
                No papers uploaded yet
              </p>
            }
          >
            <For each={projectStore.papers}>
              {(paper) => (
                <div class="flex items-center gap-3 rounded-xl border border-border bg-surface-alt p-3.5">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary">
                    <FileText size={18} />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="truncate font-medium text-fg text-sm">
                      {paper.filename}
                    </div>
                    <div class="text-[0.75rem] text-fg-subtle font-mono mt-0.5">
                      {formatFileSize((paper.metadata?.size as number) ?? 0)} · {formatDate(paper.uploadedAt)}
                    </div>
                  </div>
                  <button
                    class="shrink-0 p-2 rounded-lg text-fg-subtle hover:text-error hover:bg-error-subtle transition-colors"
                    onClick={() => handleDelete(paper.id)}
                    title="Delete file"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </For>
          </Show>
        </div>
      </div>
    </div>
  )
}
