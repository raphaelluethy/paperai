/* @jsxImportSource solid-js */
import { Sun, Moon, Monitor } from "lucide-solid"
import { themeStore } from "../stores/themeStore.ts"

export function ThemeToggle() {
  const getIcon = () => {
    const pref = themeStore.preference()
    if (pref === "light") return <Sun size={14} />
    if (pref === "dark") return <Moon size={14} />
    return <Monitor size={14} />
  }

  const getLabel = () => {
    const pref = themeStore.preference()
    if (pref === "light") return "Light"
    if (pref === "dark") return "Dark"
    return "Auto"
  }

  return (
    <button
      class="flex items-center gap-2 px-3 py-2 bg-surface-muted border border-border rounded-lg text-fg-muted text-sm font-medium hover:bg-surface-emphasis hover:text-fg transition-all duration-150 cursor-pointer"
      onClick={() => themeStore.cycle()}
      title={`Theme: ${getLabel()} (click to cycle)`}
    >
      {getIcon()}
      <span>{getLabel()}</span>
    </button>
  )
}
