/* @jsxImportSource solid-js */
import { render } from "solid-js/web"
import { createSignal, onMount, Show, createEffect } from "solid-js"
import { MessageSquare, Files, Settings } from "lucide-solid"
import { projectStore } from "./stores/projectStore.ts"
import { chatStore } from "./stores/chatStore.ts"
import "./stores/themeStore.ts"
import { Sidebar } from "./components/Sidebar.tsx"
import { ProjectForm } from "./components/ProjectForm.tsx"
import { FileUpload } from "./components/FileUpload.tsx"
import { ChatInterface } from "./components/ChatInterface.tsx"
import { ProjectSettings } from "./components/ProjectSettings.tsx"
import { ThemeToggle } from "./components/ThemeToggle.tsx"

type Tab = "chat" | "files" | "settings"

function App() {
  const [showProjectForm, setShowProjectForm] = createSignal(false)
  const [editingProject, setEditingProject] = createSignal<typeof projectStore.selectedProject | null>(null)
  const [activeTab, setActiveTab] = createSignal<Tab>("chat")

  onMount(async () => {
    await projectStore.fetchProjects()
  })

  createEffect(() => {
    const projectId = projectStore.selectedProjectId()
    if (projectId) {
      chatStore.connect(projectId)
    }
  })

  const handleNewProject = () => {
    setEditingProject(null)
    setShowProjectForm(true)
  }

  const TabButton = (props: { tab: Tab; icon: any; label: string; count?: number }) => (
    <button
      type="button"
      class={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
        activeTab() === props.tab
          ? "bg-surface text-fg shadow-sm"
          : "text-fg-muted hover:text-fg"
      }`}
      onClick={() => setActiveTab(props.tab)}
    >
      <props.icon size={15} />
      <span>{props.label}</span>
      <Show when={props.count !== undefined}>
        <span class="text-[0.7rem] text-fg-subtle bg-surface-emphasis px-1.5 py-0.5 rounded-md font-mono">
          {props.count}
        </span>
      </Show>
    </button>
  )

  return (
    <div class="flex h-screen overflow-hidden bg-surface">
      <Sidebar onNewProject={handleNewProject} />

      <div class="flex flex-1 flex-col overflow-hidden min-w-0">
        <div class="flex items-center justify-between px-6 py-4 border-b border-border-muted bg-surface-alt shrink-0">
          <Show
            when={projectStore.selectedProjectId()}
            fallback={<div />}
          >
            <h2 class="text-base font-semibold text-fg tracking-tight">{projectStore.selectedProject?.name}</h2>
          </Show>
          <div class="flex items-center gap-3">
            <Show when={projectStore.selectedProjectId()}>
              <div class="flex gap-1 bg-surface-muted p-1 rounded-xl">
                <TabButton tab="chat" icon={MessageSquare} label="Chat" />
                <TabButton tab="files" icon={Files} label="Files" count={projectStore.papers.length} />
                <TabButton tab="settings" icon={Settings} label="Settings" />
              </div>
            </Show>
            <ThemeToggle />
          </div>
        </div>

        <Show
          when={projectStore.selectedProjectId()}
          fallback={
            <div class="flex flex-1 flex-col items-center justify-center text-center p-12 animate-fade-in">
              <div class="w-16 h-16 rounded-2xl bg-surface-muted flex items-center justify-center mb-6 text-fg-subtle">
                <Files size={28} />
              </div>
              <h2 class="text-xl font-semibold mb-2 text-fg tracking-tight">Welcome to PaperAI</h2>
              <p class="text-fg-muted text-sm">Select a project or create a new one to get started</p>
            </div>
          }
        >

          <Show when={activeTab() === "chat"}>
            <ChatInterface />
          </Show>

          <Show when={activeTab() === "files"}>
            <FileUpload />
          </Show>

          <Show when={activeTab() === "settings"}>
            <ProjectSettings onSaved={() => setActiveTab("chat")} />
          </Show>
        </Show>
      </div>

      <Show when={showProjectForm()}>
        <ProjectForm
          project={editingProject() ?? undefined}
          onClose={() => setShowProjectForm(false)}
        />
      </Show>
    </div>
  )
}

render(() => <App />, document.getElementById("app")!)
