declare module "bun" {
  interface Env {
    ANTHROPIC_API_KEY: string;
    DATABASE_URL: string;
    NODE_ENV: "development" | "production" | "test";
    OPENAI_API_KEY: string;
    PAPERS_DIR: string;
  }
}