import { onMount, onCleanup } from "solid-js"

export type KeyboardShortcut = {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  handler: (e: KeyboardEvent) => void
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keyMatches = e.key.toLowerCase() === shortcut.key.toLowerCase()
        const ctrlMatches = (shortcut.ctrl ?? false) === e.ctrlKey
        const shiftMatches = (shortcut.shift ?? false) === e.shiftKey
        const altMatches = (shortcut.alt ?? false) === e.altKey
        const metaMatches = (shortcut.meta ?? false) === e.metaKey

        if (keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches) {
          shortcut.handler(e)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    onCleanup(() => {
      window.removeEventListener("keydown", handleKeyDown)
    })
  })
}