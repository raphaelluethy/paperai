import { createSignal, createEffect } from "solid-js"

export type ThemePreference = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

const STORAGE_KEY = "paperai-theme"

function getStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return "system"
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored
  }
  return "system"
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

const [preference, setPreferenceSignal] = createSignal<ThemePreference>(getStoredPreference())
const [resolved, setResolved] = createSignal<ResolvedTheme>(
  getStoredPreference() === "system" ? getSystemTheme() : getStoredPreference() as ResolvedTheme
)

function updateResolved() {
  const pref = preference()
  if (pref === "system") {
    setResolved(getSystemTheme())
  } else {
    setResolved(pref)
  }
}

function applyTheme(theme: ResolvedTheme) {
  document.documentElement.setAttribute("data-theme", theme)
}

if (typeof window !== "undefined") {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
  mediaQuery.addEventListener("change", () => {
    if (preference() === "system") {
      updateResolved()
    }
  })

  createEffect(() => {
    applyTheme(resolved())
  })

  applyTheme(resolved())
}

export const themeStore = {
  preference,
  resolved,

  setPreference(pref: ThemePreference) {
    setPreferenceSignal(pref)
    localStorage.setItem(STORAGE_KEY, pref)
    updateResolved()
  },

  cycle() {
    const current = preference()
    const next: ThemePreference =
      current === "light" ? "dark" :
      current === "dark" ? "system" : "light"
    this.setPreference(next)
  }
}
