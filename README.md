# PaperAI

Academic paper analysis application powered by Claude. Create projects, define evaluation criteria, upload PDFs, and have Claude analyze papers using an agent-sub-agent architecture.

## Features

- **Project Management**: Create and organize research projects with custom evaluation criteria, questions, and tags
- **PDF Upload**: Upload academic papers for analysis
- **AI-Powered Analysis**: Claude analyzes papers against your defined criteria
- **Agent Activity Visualization**: Real-time view of main agent and sub-agent activity with tool usage tracking
- **Conversation Persistence**: Full chat history saved to database with timestamped messages
- **Chat History**: Browse and view previous conversations, start new chats anytime
- **Theme Support**: Light and dark modes with warm, paper-inspired color palette
- **Keyboard Shortcuts**: Quick access to common actions

## Tech Stack

- **Runtime**: Bun
- **Frontend**: SolidJS with @solidjs/router
- **Backend**: Effect with Bun.serve()
- **AI**: Claude Agent SDK
- **Database**: PostgreSQL with Drizzle ORM
- **Deployment**: Docker with docker-compose

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) installed
- [Docker](https://docker.com) and Docker Compose installed
- Claude Code CLI authenticated (for agent functionality)

### Development Setup

1. **Install dependencies**
   ```bash
   bun install
   ```

2. **Start the database**
   ```bash
   docker-compose up db -d
   ```

3. **Run database migrations**
   ```bash
   bun run db:push
   ```

4. **Start the development server**
   ```bash
   bun run dev
   ```

5. **Open the app**
   Navigate to http://localhost:3000

### Production Setup (Docker)

1. **Build and start all services**
   ```bash
   docker-compose up --build
   ```

2. **Mount custom papers directory** (optional)
   ```bash
   PAPERS_DIR=/path/to/your/papers docker-compose up
   ```

## Project Structure

```
paperai/
├── src/
│   ├── server/
│   │   ├── index.ts              # Bun.serve entry point
│   │   ├── api/                  # API route handlers
│   │   ├── services/             # Effect services
│   │   └── db/                   # Drizzle schema & config
│   └── client/
│       ├── index.html            # Entry HTML
│       ├── App.tsx               # Root SolidJS component
│       ├── components/           # UI components
│       └── stores/               # State management
├── drizzle/                      # Database migrations
├── docker/                       # Docker configuration
├── papers/                       # PDF storage (gitignored)
└── docker-compose.yml
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server with HMR |
| `bun run start` | Start production server |
| `bun run db:generate` | Generate Drizzle migrations |
| `bun run db:push` | Push schema to database |
| `bun run db:studio` | Open Drizzle Studio |
| `bun run typecheck` | Run TypeScript type checking |
| `bun run lint` | Run ESLint |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgres://paperai:paperai@localhost:5432/paperai` | PostgreSQL connection string |
| `PAPERS_DIR` | `./papers` | Directory for PDF storage |

## LLM Provider Configuration

PaperAI supports two modes for LLM provider configuration:

### Claude Max/Pro Mode (USE_LOCAL=true)

Uses your Claude cloud subscription via the `claude` CLI authentication. This mode requires you to have the Claude Code CLI installed and authenticated with your Anthropic account.

### Custom Provider Mode

Uses custom Anthropic-compatible API providers (e.g., Synthetic, OpenRouter, or self-hosted endpoints). This mode is activated when `USE_LOCAL` is not set or set to a falsy value.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `USE_LOCAL` | No | Set to `"true"` or `"1"` to enable Claude Max/Pro mode (local mode). Omit or set to any other value for custom provider mode. |
| `ANTHROPIC_BASE_URL` | Yes (custom mode) | API endpoint URL for the custom provider (e.g., `https://api.synthetic.li/v1/`) |
| `ANTHROPIC_AUTH_TOKEN` | Yes (custom mode) | Authentication token for the custom provider (alternative to `ANTHROPIC_API_KEY`) |
| `ANTHROPIC_API_KEY` | Yes (custom mode) | API key for the custom provider (alternative to `ANTHROPIC_AUTH_TOKEN`) |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | No | Model identifier for Claude Opus (default: `claude-opus-4-20250514`) |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | No | Model identifier for Claude Sonnet (default: `claude-sonnet-4-20250514`) |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | No | Model identifier for Claude Haiku (default: `claude-haiku-4-20250514`) |
| `CLAUDE_CODE_SUBAGENT_MODEL` | No | Model to use for sub-agents (e.g., `claude-sonnet-4-20250514`) |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | No | Set to `"1"` to disable non-essential traffic (telemetry, etc.) |

### Example Configurations

**Claude Max/Pro Mode:**
```bash
USE_LOCAL=true
CLAUDE_CODE_SUBAGENT_MODEL=claude-sonnet-4-20250514
```

**Custom Provider Mode (e.g., Synthetic):**
```bash
USE_LOCAL=false
ANTHROPIC_BASE_URL=https://api.synthetic.li/v1/
ANTHROPIC_AUTH_TOKEN=your-token-here
ANTHROPIC_DEFAULT_OPUS_MODEL=claude-opus-4-20250514
ANTHROPIC_DEFAULT_SONNET_MODEL=claude-sonnet-4-20250514
ANTHROPIC_DEFAULT_HAIKU_MODEL=claude-haiku-4-20250514
CLAUDE_CODE_SUBAGENT_MODEL=claude-sonnet-4-20250514
```

## API Endpoints

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create a project
- `GET /api/projects/:id` - Get a project
- `PUT /api/projects/:id` - Update a project
- `DELETE /api/projects/:id` - Delete a project

### Files
- `GET /api/projects/:id/files` - List project files
- `POST /api/projects/:id/files` - Upload a file
- `DELETE /api/projects/:id/files/:fileId` - Delete a file

### Conversations
- `GET /api/projects/:id/conversations` - List conversations
- `GET /api/projects/:id/conversations/:convId` - Get conversation with messages

### WebSocket
- `ws://localhost:3000/ws/:projectId` - Chat WebSocket connection

## How It Works

1. **Create a Project**: Define your research topic, evaluation criteria, and questions
2. **Upload Papers**: Add PDF files to your project
3. **Chat with Claude**: Ask questions about your papers
4. **Agent Analysis**: Claude uses sub-agents to analyze multiple papers in parallel
5. **View Activity**: Watch the agent activity tree to see analysis progress

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Shift + O` | Start new chat |
| `Cmd/Ctrl + B` | Toggle agent activity sidebar (right panel) |
| `Enter` | Send message |
| `Shift + Enter` | New line in message |

## Architecture

PaperAI uses a multi-agent architecture:

- **Main Agent**: Handles user queries and orchestrates sub-agents
- **Sub-Agents**: Spawned for parallel paper analysis
- **Tools**: Agents can Read, Glob, Grep, and use Bash commands
- **WebSocket**: Real-time updates for streaming responses and tool activity

## License

MIT
