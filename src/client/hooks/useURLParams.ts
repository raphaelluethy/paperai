import { createEffect, createSignal } from "solid-js"

export type URLParams = {
  projectId: string | null
  conversationId: string | null
}

export function useURLParams() {
  const [params, setParams] = createSignal<URLParams>({
    projectId: null,
    conversationId: null,
  })

  // Read URL on mount
  createEffect(() => {
    const url = new URL(window.location.href)
    const projectId = url.searchParams.get("project")
    const conversationId = url.searchParams.get("conversation")
    
    setParams({
      projectId,
      conversationId,
    })
  })

  // Update URL when params change
  const updateParams = (newParams: Partial<URLParams>) => {
    const url = new URL(window.location.href)
    
    if (newParams.projectId !== undefined) {
      if (newParams.projectId) {
        url.searchParams.set("project", newParams.projectId)
      } else {
        url.searchParams.delete("project")
        url.searchParams.delete("conversation")
      }
    }
    
    if (newParams.conversationId !== undefined) {
      if (newParams.conversationId) {
        url.searchParams.set("conversation", newParams.conversationId)
      } else {
        url.searchParams.delete("conversation")
      }
    }
    
    window.history.replaceState(null, "", url.toString())
    
    setParams((current) => ({
      ...current,
      ...newParams,
    }))
  }

  return {
    params,
    updateParams,
  }
}