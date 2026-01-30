/**
 * LLM Provider Configuration Module
 *
 * Manages configuration for the Anthropic Claude SDK, supporting both
 * local and custom (API-based) modes.
 */

/**
 * Check if local mode is enabled via USE_LOCAL env var.
 * Returns true if USE_LOCAL is "true" or "1" (case-insensitive).
 */
export const useLocal: boolean = (() => {
  const useLocalEnv = Bun.env.USE_LOCAL
  if (!useLocalEnv) return false
  const normalized = useLocalEnv.toLowerCase().trim()
  return normalized === "true" || normalized === "1"
})()

/**
 * Environment variables for the Claude SDK.
 * Returns an empty object in local mode.
 * In custom mode, returns required and optional Anthropic configuration.
 * Throws an error if required variables are missing in non-local mode.
 */
export const llmEnv: Record<string, string> = (() => {
  if (useLocal) {
    return {}
  }

  // Required: ANTHROPIC_BASE_URL
  const baseUrl = Bun.env.ANTHROPIC_BASE_URL
  if (!baseUrl) {
    throw new Error(
      "ANTHROPIC_BASE_URL is required when USE_LOCAL is not enabled. " +
        "Please set ANTHROPIC_BASE_URL environment variable."
    )
  }

  // Required: ANTHROPIC_AUTH_TOKEN (as env var name) or ANTHROPIC_API_KEY
  // ANTHROPIC_AUTH_TOKEN specifies which env var contains the actual token
  let authToken: string | undefined
  let authTokenSource: "ANTHROPIC_AUTH_TOKEN" | "ANTHROPIC_API_KEY" = "ANTHROPIC_API_KEY"

  if (Bun.env.ANTHROPIC_AUTH_TOKEN) {
    // ANTHROPIC_AUTH_TOKEN contains the name of the env var holding the actual token
    const tokenVarName = Bun.env.ANTHROPIC_AUTH_TOKEN
    authToken = Bun.env[tokenVarName]
    if (!authToken) {
      throw new Error(
        `ANTHROPIC_AUTH_TOKEN references "${tokenVarName}" but that environment variable is not set. ` +
          `Please set ${tokenVarName} to your API token, or unset ANTHROPIC_AUTH_TOKEN to use ANTHROPIC_API_KEY directly.`
      )
    }
    authTokenSource = "ANTHROPIC_AUTH_TOKEN"
  } else if (Bun.env.ANTHROPIC_API_KEY) {
    authToken = Bun.env.ANTHROPIC_API_KEY
  }

  if (!authToken) {
    throw new Error(
      "Either ANTHROPIC_AUTH_TOKEN (as env var reference) or ANTHROPIC_API_KEY is required when USE_LOCAL is not enabled. " +
        "Set ANTHROPIC_AUTH_TOKEN to the name of an env var containing your token (e.g., ANTHROPIC_AUTH_TOKEN=MY_SECRET_KEY), " +
        "or set ANTHROPIC_API_KEY directly."
    )
  }

  const env: Record<string, string> = {
    ANTHROPIC_BASE_URL: baseUrl,
  }

  // Use the resolved auth token with the appropriate key
  env[authTokenSource] = authToken

  // Optional model configurations
  if (Bun.env.ANTHROPIC_DEFAULT_OPUS_MODEL) {
    env.ANTHROPIC_DEFAULT_OPUS_MODEL = Bun.env.ANTHROPIC_DEFAULT_OPUS_MODEL
  }
  if (Bun.env.ANTHROPIC_DEFAULT_SONNET_MODEL) {
    env.ANTHROPIC_DEFAULT_SONNET_MODEL = Bun.env.ANTHROPIC_DEFAULT_SONNET_MODEL
  }
  if (Bun.env.ANTHROPIC_DEFAULT_HAIKU_MODEL) {
    env.ANTHROPIC_DEFAULT_HAIKU_MODEL = Bun.env.ANTHROPIC_DEFAULT_HAIKU_MODEL
  }
  if (Bun.env.CLAUDE_CODE_SUBAGENT_MODEL) {
    env.CLAUDE_CODE_SUBAGENT_MODEL = Bun.env.CLAUDE_CODE_SUBAGENT_MODEL
  }
  if (Bun.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC) {
    env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = Bun.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC
  }

  return env
})()

/**
 * Map of abstract model names to their environment variable names.
 */
const MODEL_ENV_MAP = {
  opus: "ANTHROPIC_DEFAULT_OPUS_MODEL",
  sonnet: "ANTHROPIC_DEFAULT_SONNET_MODEL",
  haiku: "ANTHROPIC_DEFAULT_HAIKU_MODEL",
} as const

/**
 * Resolve an abstract model name to its configured model name.
 *
 * In local mode, returns the original model name.
 * In custom mode, checks for a custom model mapping via environment variables.
 * Falls back to the original model name if no custom mapping is set.
 *
 * @param model - The abstract model name ("opus", "sonnet", or "haiku")
 * @returns The resolved model name to use
 */
export function resolveModel(model: "opus" | "sonnet" | "haiku"): string {
  if (useLocal) {
    return model
  }

  const envVarName = MODEL_ENV_MAP[model]
  const customModel = Bun.env[envVarName]

  return customModel ?? model
}