import { defineConfig } from "drizzle-kit"
import { config } from "dotenv"

config({ path: ".env.local" })
config({ path: ".env" })

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://paperai:paperai@localhost:5432/paperai",
  },
})
