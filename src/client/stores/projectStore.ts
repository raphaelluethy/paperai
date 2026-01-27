import { createStore } from "solid-js/store"
import { createSignal } from "solid-js"

export type Project = {
  id: string
  name: string
  description: string | null
  criteria: string[] | null
  questions: string[] | null
  tags: string[] | null
  localPath: string | null
  createdAt: string
  updatedAt: string
}

export type Paper = {
  id: string
  projectId: string
  filename: string
  path: string
  metadata: Record<string, unknown> | null
  uploadedAt: string
}

const [projects, setProjects] = createStore<Project[]>([])
const [selectedProjectId, setSelectedProjectId] = createSignal<string | null>(null)
const [papers, setPapers] = createStore<Paper[]>([])
const [loading, setLoading] = createSignal(false)
const [error, setError] = createSignal<string | null>(null)

const API_BASE = "/api"

export const projectStore = {
  projects,
  selectedProjectId,
  papers,
  loading,
  error,

  get selectedProject() {
    const id = selectedProjectId()
    return projects.find((p) => p.id === id)
  },

  async fetchProjects() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/projects`)
      if (!res.ok) throw new Error("Failed to fetch projects")
      const data = await res.json()
      setProjects(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  },

  async createProject(data: { name: string; description?: string }) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to create project")
      const project = await res.json()
      setProjects([project, ...projects])
      return project
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
      throw e
    } finally {
      setLoading(false)
    }
  },

  async updateProject(id: string, data: Partial<Project>) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to update project")
      const project = await res.json()
      setProjects(
        projects.map((p) => (p.id === id ? project : p))
      )
      return project
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
      throw e
    } finally {
      setLoading(false)
    }
  },

  async deleteProject(id: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/projects/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete project")
      setProjects(projects.filter((p) => p.id !== id))
      if (selectedProjectId() === id) {
        setSelectedProjectId(null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
      throw e
    } finally {
      setLoading(false)
    }
  },

  selectProject(id: string | null) {
    setSelectedProjectId(id)
    if (id) {
      this.fetchPapers(id)
    } else {
      setPapers([])
    }
  },

  async fetchPapers(projectId: string) {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/files`)
      if (!res.ok) throw new Error("Failed to fetch papers")
      const data = await res.json()
      setPapers(data)
    } catch (e) {
      console.error("Failed to fetch papers:", e)
    }
  },

  async uploadPaper(projectId: string, file: File) {
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/files`, {
        method: "POST",
        body: formData,
      })
      if (!res.ok) throw new Error("Failed to upload paper")
      const paper = await res.json()
      setPapers([paper, ...papers])
      return paper
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
      throw e
    }
  },

  async deletePaper(projectId: string, paperId: string) {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/files/${paperId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete paper")
      setPapers(papers.filter((p) => p.id !== paperId))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
      throw e
    }
  },
}
