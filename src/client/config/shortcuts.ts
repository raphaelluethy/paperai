import { KeyboardShortcut } from "../hooks/useKeyboardShortcuts"
import { chatStore } from "../stores/chatStore"
import { projectStore } from "../stores/projectStore"

export type ShortcutAction = {
  id: string
  name: string
  description: string
  keys: string
  shortcut: Omit<KeyboardShortcut, "handler">
  handler: () => void
}

export const shortcuts: ShortcutAction[] = [
  {
    id: "new-chat",
    name: "New Chat",
    description: "Create a new chat conversation",
    keys: "Cmd+Shift+O",
    shortcut: {
      key: "o",
      meta: true,
      shift: true,
    },
    handler: () => {
      if (projectStore.selectedProjectId()) {
        chatStore.createNewChat()
      }
    },
  },
  // Add more shortcuts here in the future
]

export function getShortcutByKey(key: string): ShortcutAction | undefined {
  return shortcuts.find((s) => s.id === key)
}

export function getShortcutKeys(): KeyboardShortcut[] {
  return shortcuts.map((s) => ({
    ...s.shortcut,
    handler: s.handler,
  }))
}