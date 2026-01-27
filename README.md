# PaperAI

Academic paper analysis application powered by Claude. Create projects, define evaluation criteria, upload PDFs, and have Claude analyze papers using an agent-sub-agent architecture.

## Features

- **Project Management**: Create and organize research projects with custom evaluation criteria
- **PDF Upload**: Upload academic papers for analysis
- **AI-Powered Analysis**: Claude analyzes papers against your defined criteria
- **Agent Activity Visualization**: Real-time view of main agent and sub-agent activity
- **Conversation Persistence**: Full chat history saved to database

## Tech Stack

- **Runtime**: Bun
- **Frontend**: SolidJS
- **Backend**: Effect with Bun.serve()
- **AI**: Claude Agent SDK
- **Database**: PostgreSQL with Drizzle ORM
- **Deployment**: Docker

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
