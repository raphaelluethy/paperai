.PHONY: dev start build db-seed db-migrate db-generate db-push db-studio lint lint-fix format format-check typecheck run

# Run the client with bun (development mode with hot reload)
dev:
	bun run dev

# Run the server in production mode
start:
	bun run start

# Build the client
build:
	bun run build

# Database commands
db-seed: db-migrate
	@echo "Database migrated and ready"

db-migrate:
	bunx drizzle-kit migrate

db-generate:
	bunx drizzle-kit generate

db-push:
	bunx drizzle-kit push

db-studio:
	bunx drizzle-kit studio

# Linting and formatting
lint:
	bun run lint

lint-fix:
	bun run lint:fix

format:
	bun run format

format-check:
	bun run format:check

typecheck:
	bun run typecheck

# Full setup: migrate db then start the server
run: db-migrate
	bun run dev
