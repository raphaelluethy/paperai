import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema.ts"

const connectionString = Bun.env.DATABASE_URL ?? "postgres://paperai:paperai@localhost:5432/paperai"

const client = postgres(connectionString)
export const db = drizzle(client, { schema })

export { schema }
export type Database = typeof db
