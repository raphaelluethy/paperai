import { pgTable, text, timestamp, uuid, jsonb, integer, vector, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  criteria: jsonb("criteria").$type<string[]>(),
  questions: jsonb("questions").$type<string[]>(),
  tags: text("tags").array(),
  localPath: text("local_path"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const papers = pgTable("papers", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  filename: text("filename").notNull(),
  path: text("path").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
})

export const paperChunks = pgTable(
  "paper_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paperId: uuid("paper_id")
      .references(() => papers.id, { onDelete: "cascade" })
      .notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 768 }),
    chunkIndex: integer("chunk_index").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops"))]
)

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: text("session_id"),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .references(() => conversations.id, { onDelete: "cascade" })
    .notNull(),
  role: text("role").notNull().$type<"user" | "assistant" | "system">(),
  content: text("content").notNull(),
  agentActivity: jsonb("agent_activity").$type<AgentActivityNode[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export type AgentActivityNode = {
  id: string
  name: string
  status: "pending" | "running" | "done" | "error"
  description?: string
  input?: Record<string, unknown>
  output?: unknown
  startTime?: number
  endTime?: number
  children?: AgentActivityNode[]
}

// Relations
export const projectsRelations = relations(projects, ({ many }) => ({
  papers: many(papers),
  conversations: many(conversations),
}))

export const papersRelations = relations(papers, ({ one, many }) => ({
  project: one(projects, {
    fields: [papers.projectId],
    references: [projects.id],
  }),
  chunks: many(paperChunks),
}))

export const paperChunksRelations = relations(paperChunks, ({ one }) => ({
  paper: one(papers, {
    fields: [paperChunks.paperId],
    references: [papers.id],
  }),
}))

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  project: one(projects, {
    fields: [conversations.projectId],
    references: [projects.id],
  }),
  messages: many(messages),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}))

// Type exports
export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type Paper = typeof papers.$inferSelect
export type NewPaper = typeof papers.$inferInsert
export type Conversation = typeof conversations.$inferSelect
export type NewConversation = typeof conversations.$inferInsert
export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
export type PaperChunk = typeof paperChunks.$inferSelect
export type NewPaperChunk = typeof paperChunks.$inferInsert
