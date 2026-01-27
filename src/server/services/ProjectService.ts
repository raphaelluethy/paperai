import { Context, Effect, Layer } from "effect"
import { db, schema } from "../db/index.ts"
import { eq } from "drizzle-orm"
import type { NewProject, Project } from "../db/schema.ts"

export class ProjectService extends Context.Tag("ProjectService")<
  ProjectService,
  {
    readonly list: () => Effect.Effect<Project[], Error>
    readonly get: (id: string) => Effect.Effect<Project | undefined, Error>
    readonly create: (data: Omit<NewProject, "id" | "createdAt" | "updatedAt">) => Effect.Effect<Project, Error>
    readonly update: (id: string, data: Partial<Omit<NewProject, "id" | "createdAt" | "updatedAt">>) => Effect.Effect<Project | undefined, Error>
    readonly delete: (id: string) => Effect.Effect<boolean, Error>
  }
>() {}

export const ProjectServiceLive = Layer.succeed(
  ProjectService,
  ProjectService.of({
    list: () =>
      Effect.tryPromise({
        try: () => db.query.projects.findMany({
          orderBy: (projects, { desc }) => [desc(projects.createdAt)],
        }),
        catch: (e) => new Error(`Failed to list projects: ${e}`),
      }),

    get: (id: string) =>
      Effect.tryPromise({
        try: () => db.query.projects.findFirst({
          where: eq(schema.projects.id, id),
        }),
        catch: (e) => new Error(`Failed to get project: ${e}`),
      }),

    create: (data) =>
      Effect.tryPromise({
        try: async () => {
          const [project] = await db
            .insert(schema.projects)
            .values(data)
            .returning()
          return project!
        },
        catch: (e) => new Error(`Failed to create project: ${e}`),
      }),

    update: (id, data) =>
      Effect.tryPromise({
        try: async () => {
          const [project] = await db
            .update(schema.projects)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(schema.projects.id, id))
            .returning()
          return project
        },
        catch: (e) => new Error(`Failed to update project: ${e}`),
      }),

    delete: (id) =>
      Effect.tryPromise({
        try: async () => {
          const result = await db.delete(schema.projects).where(eq(schema.projects.id, id)).returning()
          return result.length > 0
        },
        catch: (e) => new Error(`Failed to delete project: ${e}`),
      }),
  })
)
