#!/bin/bash

# Parse arguments
CLEAN=false
DB_ONLY=false
RESTART=false
DOWN=false

for arg in "$@"; do
    case $arg in
        --clean)
            CLEAN=true
            shift
            ;;
        --db)
            DB_ONLY=true
            shift
            ;;
        --restart)
            RESTART=true
            shift
            ;;
        --down)
            DOWN=true
            shift
            ;;
    esac
done

# Check if session exists
SESSION_EXISTS=false
if tmux has-session -t paperai 2>/dev/null; then
    SESSION_EXISTS=true
fi

# Down mode: shut down both services
if [ "$DOWN" = true ]; then
    echo "Shutting down services..."
    
    # Kill tmux session if it exists
    if [ "$SESSION_EXISTS" = true ]; then
        tmux kill-session -t paperai
        echo "Killed tmux session"
    fi
    
    # Stop docker containers
    docker compose down
    echo "Stopped docker containers"
    
    exit 0
fi

# Clean mode: stop containers, remove node_modules, and rebuild
if [ "$CLEAN" = true ]; then
    echo "Cleaning up..."
    
    # Kill tmux session if it exists
    if [ "$SESSION_EXISTS" = true ]; then
        tmux kill-session -t paperai
        echo "Killed existing tmux session"
    fi
    
    # Stop and remove docker containers
    docker compose down -v
    echo "Stopped and removed docker containers"
    
    # Remove node_modules and lock files
    rm -rf node_modules bun.lockb
    echo "Removed node_modules and lock files"
    
    # Reinstall dependencies
    bun install
    echo "Reinstalled dependencies"
    
    # Small delay to ensure terminal is ready
    sleep 1
    
    SESSION_EXISTS=false
fi

# DB only mode: just start the database
if [ "$DB_ONLY" = true ]; then
    echo "Starting database only..."
    
    # Kill existing session if it exists
    if [ "$SESSION_EXISTS" = true ]; then
        tmux kill-session -t paperai
    fi
    
    # Create session with only database window
    tmux new-session -d -s paperai -n paperai-db
    tmux send-keys -t paperai:paperai-db 'docker compose up db' C-m
    
    echo "Created tmux session 'paperai' with database only"
    tmux attach -t paperai
    exit 0
fi

# Restart mode or session already exists: kill and recreate
if [ "$RESTART" = true ] || [ "$SESSION_EXISTS" = true ]; then
    if [ "$SESSION_EXISTS" = true ]; then
        echo "Restarting paperai session..."
        tmux kill-session -t paperai
    else
        echo "Creating new paperai session..."
    fi
fi

# Create a new tmux session named 'paperai' if it doesn't exist
# -d flag creates the session in detached mode
if ! tmux has-session -t paperai 2>/dev/null; then
    # Create session with a single window split into two panes
    tmux new-session -d -s paperai -n paperai-dev

    # Dev server (top pane)
    tmux send-keys -t paperai:paperai-dev 'bun dev' C-m

    # Database (bottom pane) - only start the db service
    tmux split-window -t paperai:paperai-dev -v
    tmux send-keys -t paperai:paperai-dev.1 'docker compose up db' C-m

    # Keep focus on dev pane
    tmux select-pane -t paperai:paperai-dev.0

    echo "Created tmux session 'paperai' with dev+db panes"
else
    echo "Tmux session 'paperai' already exists. Attaching..."
fi

# Attach to the session
tmux attach -t paperai
