import { createStore } from "solid-js/store"
import { createSignal } from "solid-js"

export type Message = {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  agentActivity?: AgentActivityNode[]
}

export type AgentActivityNode = {
  id: string
  name: string
  status: "pending" | "running" | "done" | "error"
  description?: string
  input?: Record<string, unknown>
  output?: unknown
  startTime?: number
  endTime?: number
  children?: AgentActivityNode[]
}

export type Conversation = {
  id: string
  projectId: string
  sessionId: string | null
  title: string | null
  createdAt: string
  updatedAt: string
}

const [messages, setMessages] = createStore<Message[]>([])
const [agentActivity, setAgentActivity] = createStore<AgentActivityNode[]>([])
const [conversations, setConversations] = createStore<Conversation[]>([])
const [isConnected, setIsConnected] = createSignal(false)
const [isProcessing, setIsProcessing] = createSignal(false)
const [sessionId, setSessionId] = createSignal<string | null>(null)
const [queryStartTime, setQueryStartTime] = createSignal<number | null>(null)
const [modelName, setModelName] = createSignal("opus")
const [currentConversationId, setCurrentConversationId] = createSignal<string | null>(null)
const [isReadOnly, setIsReadOnly] = createSignal(false)

let ws: WebSocket | null = null
let currentProjectId: string | null = null

const API_BASE = "/api"

export const chatStore = {
  messages,
  agentActivity,
  conversations,
  isConnected,
  isProcessing,
  sessionId,
  queryStartTime,
  modelName,
  currentConversationId,
  isReadOnly,

  connect(projectId: string, conversationId?: string) {
    if (ws && currentProjectId === projectId && ws.readyState === WebSocket.OPEN && !conversationId) {
      return
    }

    this.disconnect()
    currentProjectId = projectId

    if (conversationId) {
      setCurrentConversationId(conversationId)
      setIsReadOnly(true)
    } else {
      setCurrentConversationId(null)
      setIsReadOnly(false)
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    ws = new WebSocket(`${protocol}//${window.location.host}/ws/${projectId}`)

    ws.onopen = () => {
      setIsConnected(true)
      console.log("WebSocket connected")
    }

    ws.onclose = () => {
      setIsConnected(false)
      console.log("WebSocket disconnected")
    }

    ws.onerror = (error) => {
      console.error("WebSocket error:", error)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.handleMessage(data)
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e)
      }
    }
  },

  disconnect() {
    if (ws) {
      ws.close()
      ws = null
    }
    currentProjectId = null
    setIsConnected(false)
    setMessages([])
    setAgentActivity([])
    setCurrentConversationId(null)
    setIsReadOnly(false)
  },

  async fetchConversations(projectId: string) {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/conversations`)
      if (!res.ok) throw new Error("Failed to fetch conversations")
      const data = await res.json()
      setConversations(data)
    } catch (e) {
      console.error("Failed to fetch conversations:", e)
    }
  },

  async loadConversation(conversationId: string) {
    try {
      const res = await fetch(`${API_BASE}/projects/${currentProjectId}/conversations/${conversationId}`)
      if (!res.ok) throw new Error("Failed to load conversation")
      const data = await res.json()
      
      // Convert string timestamps to Date objects
      const loadedMessages = data.messages.map((m: any) => ({
        ...m,
        timestamp: new Date(m.createdAt),
        agentActivity: m.agentActivity,
      }))
      
      setMessages(loadedMessages)
      setCurrentConversationId(conversationId)
      setIsReadOnly(true)
      
      // Load agent activity from the last assistant message if available
      const lastAssistantMsg = loadedMessages.reverse().find((m: Message) => m.role === "assistant")
      if (lastAssistantMsg?.agentActivity) {
        setAgentActivity(lastAssistantMsg.agentActivity)
      }
    } catch (e) {
      console.error("Failed to load conversation:", e)
    }
  },

  createNewChat() {
    setMessages([])
    setAgentActivity([])
    setCurrentConversationId(null)
    setIsReadOnly(false)
    setSessionId(null)
    if (currentProjectId) {
      this.connect(currentProjectId)
    }
  },

  async deleteConversation(conversationId: string) {
    try {
      const res = await fetch(`${API_BASE}/projects/${currentProjectId}/conversations/${conversationId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete conversation")
      
      setConversations(conversations.filter((c) => c.id !== conversationId))
      
      if (currentConversationId() === conversationId) {
        this.createNewChat()
      }
    } catch (e) {
      console.error("Failed to delete conversation:", e)
    }
  },

  async deleteAllConversations() {
    if (!currentProjectId) return
    if (!confirm("Delete all conversations in this project?")) return
    
    try {
      const res = await fetch(`${API_BASE}/projects/${currentProjectId}/conversations`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete all conversations")
      
      setConversations([])
      this.createNewChat()
    } catch (e) {
      console.error("Failed to delete all conversations:", e)
    }
  },

  handleMessage(data: Record<string, unknown>) {
    switch (data.type) {
      case "session":
        setSessionId(data.sessionId as string)
        break

      case "message": {
        const lastMessage = messages[messages.length - 1]
        if (lastMessage && lastMessage.role === "assistant") {
          setMessages(messages.length - 1, "content", (c) => {
            const newContent = data.content as string
            if (c.length > 0 && !c.endsWith("\n") && !c.endsWith(" ") && !newContent.startsWith("\n") && !newContent.startsWith(" ")) {
              return c + "\n\n" + newContent
            }
            return c + newContent
          })
        } else {
          setMessages([
            ...messages,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: data.content as string,
              timestamp: new Date(),
            },
          ])
        }
        break
      }

      case "agent_activity":
        setAgentActivity(data.activity as AgentActivityNode[])
        break

      case "result":
        setIsProcessing(false)
        setQueryStartTime(null)
        setAgentActivity((activity) =>
          activity.map((node) => markAllDone(node))
        )
        // Refresh conversations list to show updated title/timestamp
        if (currentProjectId) {
          this.fetchConversations(currentProjectId)
        }
        break

      case "error":
        setIsProcessing(false)
        setQueryStartTime(null)
        setMessages([
          ...messages,
          {
            id: crypto.randomUUID(),
            role: "system",
            content: `Error: ${data.error}`,
            timestamp: new Date(),
          },
        ])
        break
    }
  },

  sendMessage(content: string) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket not connected")
      return
    }

    setMessages([
      ...messages,
      {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
      },
    ])

    setIsProcessing(true)
    setQueryStartTime(Date.now())
    setAgentActivity([])

    ws.send(JSON.stringify({ type: "chat", content }))
  },

  clearMessages() {
    setMessages([])
    setAgentActivity([])
  },

  stopQuery() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "stop" }))
      setIsProcessing(false)
      setQueryStartTime(null)
    }
  },
}

function markAllDone(node: AgentActivityNode): AgentActivityNode {
  return {
    ...node,
    status: node.status === "running" ? "done" : node.status,
    children: node.children?.map(markAllDone),
  }
}
