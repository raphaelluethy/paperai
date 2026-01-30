declare module "bun" {
  interface Env {
    ANTHROPIC_API_KEY?: string;
    DATABASE_URL: string;
    NODE_ENV: "development" | "production" | "test";
    OPENAI_API_KEY: string;
    PAPERS_DIR: string;
    EMBEDDING_PROVIDER: "ollama" | "openai";
    EMBEDDING_MODEL: string;
    USE_LOCAL?: string;
    ANTHROPIC_BASE_URL?: string;
    ANTHROPIC_AUTH_TOKEN?: string;
    ANTHROPIC_DEFAULT_OPUS_MODEL?: string;
    ANTHROPIC_DEFAULT_SONNET_MODEL?: string;
    ANTHROPIC_DEFAULT_HAIKU_MODEL?: string;
    CLAUDE_CODE_SUBAGENT_MODEL?: string;
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC?: string;
  }
}