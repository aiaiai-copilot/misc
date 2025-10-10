#!/bin/bash

# Production Startup Script for misc-poc
# This script starts the complete application stack in production mode

set -e  # Exit on error

# Load environment variables from .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | grep -v '^[[:space:]]*$' | xargs)
fi

# Set default ports if not in .env
BACKEND_PORT=${BACKEND_PORT:-3001}
WEB_PORT=${WEB_PORT:-4173}
POSTGRES_PORT=${POSTGRES_PORT:-5432}

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Function to check if PostgreSQL is ready
check_postgres() {
    print_info "Checking PostgreSQL connection..."

    # Try to connect to PostgreSQL
    if docker exec misc-postgres pg_isready -U misc > /dev/null 2>&1; then
        print_success "PostgreSQL is ready"
        return 0
    else
        return 1
    fi
}

# Function to wait for PostgreSQL to be ready
wait_for_postgres() {
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if check_postgres; then
            return 0
        fi

        print_info "Waiting for PostgreSQL... (attempt $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done

    print_error "PostgreSQL failed to start after $max_attempts attempts"
    return 1
}

# Function to detect docker-compose command
detect_docker_compose() {
    if command -v docker &> /dev/null && docker compose version &> /dev/null; then
        echo "docker compose"
    elif command -v docker-compose &> /dev/null; then
        echo "docker-compose"
    else
        print_error "Neither 'docker compose' nor 'docker-compose' found"
        echo ""
        echo "Please install Docker Compose:"
        echo "  https://docs.docker.com/compose/install/"
        echo ""
        exit 1
    fi
}

# Function to check if docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running"
        echo ""
        echo "Please start Docker first:"
        echo "  sudo service docker start    # Linux/WSL"
        echo "  systemctl start docker       # SystemD"
        echo ""
        exit 1
    fi
    print_success "Docker is running"

    # Detect and store docker-compose command
    DOCKER_COMPOSE_CMD=$(detect_docker_compose)
}

# Function to start PostgreSQL
start_postgres() {
    print_info "Starting PostgreSQL with $DOCKER_COMPOSE_CMD..."

    # Check if container already exists and is running
    if docker ps --format '{{.Names}}' | grep -q "^misc-postgres$"; then
        print_warning "PostgreSQL container is already running"
        return 0
    fi

    # Start docker-compose
    $DOCKER_COMPOSE_CMD up -d postgres

    # Wait for PostgreSQL to be ready
    if wait_for_postgres; then
        print_success "PostgreSQL started successfully"
        return 0
    else
        print_error "Failed to start PostgreSQL"
        return 1
    fi
}

# Function to check if backend is built
check_backend_build() {
    if [ ! -d "packages/backend/dist" ]; then
        print_warning "Backend not built. Building now..."
        return 1
    fi
    return 0
}

# Function to start backend
start_backend() {
    print_info "Starting backend server..."

    # Check if backend is built
    if ! check_backend_build; then
        print_info "Building backend packages..."

        # Clean TypeScript build cache to force rebuild
        find packages -name "tsconfig.tsbuildinfo" -type f -delete 2>/dev/null || true

        yarn build:packages

        # Verify backend was actually built
        if [ ! -d "packages/backend/dist" ]; then
            print_error "Backend build failed - dist directory not created"
            return 1
        fi
        print_success "Backend packages built"
    fi

    # Start backend in background
    cd packages/backend
    print_info "Starting backend on port $BACKEND_PORT..."
    PORT=$BACKEND_PORT yarn start &
    BACKEND_PID=$!
    cd ../..

    # Store PID for cleanup
    echo $BACKEND_PID > .backend.pid

    # Wait a moment for backend to start
    sleep 3

    # Check if backend is running
    if kill -0 $BACKEND_PID 2>/dev/null; then
        print_success "Backend started (PID: $BACKEND_PID)"
        return 0
    else
        print_error "Backend failed to start"
        return 1
    fi
}

# Function to check if web is built
check_web_build() {
    if [ ! -d "packages/presentation/web/dist" ]; then
        print_warning "Web application not built. Building now..."
        return 1
    fi
    return 0
}

# Function to start web preview
start_web() {
    print_info "Starting web application preview..."

    # Check if web is built
    if ! check_web_build; then
        print_info "Building web application..."

        # Clean TypeScript build cache to force rebuild
        find packages -name "tsconfig.tsbuildinfo" -type f -delete 2>/dev/null || true

        yarn build

        # Verify web was actually built
        if [ ! -d "packages/presentation/web/dist" ]; then
            print_error "Web build failed - dist directory not created"
            return 1
        fi
        print_success "Web application built"
    fi

    # Start web preview
    print_info "Starting web preview on port $WEB_PORT..."
    yarn workspace @misc-poc/presentation-web preview --port $WEB_PORT &
    WEB_PID=$!

    # Store PID for cleanup
    echo $WEB_PID > .web.pid

    # Wait a moment for web to start
    sleep 3

    # Check if web is running
    if kill -0 $WEB_PID 2>/dev/null; then
        print_success "Web preview started (PID: $WEB_PID)"
        return 0
    else
        print_error "Web preview failed to start"
        return 1
    fi
}

# Function to show application URLs
show_urls() {
    echo ""
    echo "═══════════════════════════════════════════════════"
    print_success "Application started successfully!"
    echo "═══════════════════════════════════════════════════"
    echo ""
    echo "  🌐 Web Application:  http://localhost:$WEB_PORT"
    echo "  🔌 Backend API:      http://localhost:$BACKEND_PORT"
    echo "  🗄️  PostgreSQL:       localhost:$POSTGRES_PORT"
    echo ""
    echo "═══════════════════════════════════════════════════"
    echo ""
    print_info "To stop the application, run:"
    echo "  ./scripts/stop-production.sh"
    echo ""
    print_info "Or press Ctrl+C to stop all services"
    echo ""
}

# Function to cleanup on exit
cleanup() {
    echo ""
    print_info "Shutting down application..."

    # Kill backend
    if [ -f .backend.pid ]; then
        BACKEND_PID=$(cat .backend.pid)
        if kill -0 $BACKEND_PID 2>/dev/null; then
            kill $BACKEND_PID
            print_success "Backend stopped"
        fi
        rm .backend.pid
    fi

    # Kill web
    if [ -f .web.pid ]; then
        WEB_PID=$(cat .web.pid)
        if kill -0 $WEB_PID 2>/dev/null; then
            kill $WEB_PID
            print_success "Web preview stopped"
        fi
        rm .web.pid
    fi

    # Only show PostgreSQL message if it's actually running
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^misc-postgres$"; then
        print_info "PostgreSQL is still running. To stop it:"
        echo "  docker compose down"
        echo ""
    fi
}

# Trap Ctrl+C and cleanup
trap cleanup EXIT INT TERM

# Main execution
main() {
    echo ""
    echo "═══════════════════════════════════════════════════"
    echo "  Starting misc-poc Production Environment"
    echo "═══════════════════════════════════════════════════"
    echo ""

    # Check Docker
    check_docker

    # Start PostgreSQL
    if ! start_postgres; then
        print_error "Failed to start PostgreSQL. Exiting."
        exit 1
    fi

    # Start backend
    if ! start_backend; then
        print_error "Failed to start backend. Exiting."
        exit 1
    fi

    # Start web
    if ! start_web; then
        print_error "Failed to start web application. Exiting."
        exit 1
    fi

    # Show URLs
    show_urls

    # Wait for Ctrl+C
    print_info "Application is running. Press Ctrl+C to stop."
    wait
}

# Run main function
main
