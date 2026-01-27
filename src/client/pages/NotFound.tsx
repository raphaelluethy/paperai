/* @jsxImportSource solid-js */
import { useNavigate } from "@solidjs/router"
import { FileX, Home, ArrowLeft } from "lucide-solid"

export function NotFound() {
  const navigate = useNavigate()

  return (
    <div class="min-h-screen bg-surface flex items-center justify-center p-6">
      <div class="w-full max-w-lg">
        {/* Animated background decoration */}
        <div class="absolute inset-0 overflow-hidden pointer-events-none">
          <div class="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-subtle rounded-full blur-3xl opacity-50" />
          <div class="absolute bottom-1/4 right-1/4 w-48 h-48 bg-surface-emphasis rounded-full blur-3xl opacity-30" />
        </div>

        <div class="relative text-center">
          {/* 404 Icon */}
          <div class="relative inline-flex items-center justify-center mb-8">
            <div class="absolute inset-0 bg-surface-emphasis rounded-3xl rotate-6" />
            <div class="absolute inset-0 bg-surface-muted rounded-3xl -rotate-3" />
            <div class="relative w-24 h-24 bg-surface rounded-2xl flex items-center justify-center shadow-sm border border-border-muted">
              <FileX size={40} class="text-fg-subtle" />
            </div>
          </div>

          {/* Error Code */}
          <div class="flex items-center justify-center gap-2 mb-4">
            <span class="text-7xl font-bold text-fg tracking-tighter">4</span>
            <div class="w-12 h-12 rounded-xl bg-surface-muted flex items-center justify-center">
              <span class="text-2xl text-fg-subtle">0</span>
            </div>
            <span class="text-7xl font-bold text-fg tracking-tighter">4</span>
          </div>

          {/* Title & Description */}
          <h1 class="text-2xl font-semibold text-fg mb-3 tracking-tight">
            Page not found
          </h1>
          <p class="text-fg-muted text-sm mb-8 max-w-sm mx-auto leading-relaxed">
            The page you're looking for doesn't exist or has been moved. 
            Check the URL or navigate back to continue.
          </p>

          {/* Action Buttons */}
          <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/")}
              class="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-primary-fg text-sm font-medium rounded-xl transition-all duration-150 shadow-sm hover:shadow-md w-full sm:w-auto justify-center cursor-pointer"
            >
              <Home size={16} />
              <span>Go Home</span>
            </button>
            
            <button
              type="button"
              onClick={() => navigate(-1)}
              class="flex items-center gap-2 px-5 py-2.5 bg-surface-alt hover:bg-surface-muted text-fg text-sm font-medium rounded-xl border border-border-muted transition-all duration-150 w-full sm:w-auto justify-center cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Go Back</span>
            </button>
          </div>

          {/* Quick Links */}
          <div class="mt-10 pt-8 border-t border-border-muted">
            <p class="text-xs text-fg-subtle uppercase tracking-wider font-medium mb-4">
              Popular destinations
            </p>
            <div class="flex flex-wrap items-center justify-center gap-2">
              <a
                href="/"
                class="px-4 py-2 text-sm text-fg-muted hover:text-fg bg-surface-alt hover:bg-surface-muted rounded-lg transition-colors duration-150"
              >
                Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
