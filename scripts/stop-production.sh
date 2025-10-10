#!/bin/bash

# Production Stop Script for misc-poc
# This script stops all running services

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

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Main execution
echo ""
echo "═══════════════════════════════════════════════════"
echo "  Stopping misc-poc Production Environment"
echo "═══════════════════════════════════════════════════"
echo ""

# Stop backend
if [ -f .backend.pid ]; then
    BACKEND_PID=$(cat .backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        print_success "Backend stopped (PID: $BACKEND_PID)"
    else
        print_warning "Backend process not found"
    fi
    rm .backend.pid
else
    print_info "No backend PID file found"
fi

# Stop web
if [ -f .web.pid ]; then
    WEB_PID=$(cat .web.pid)
    if kill -0 $WEB_PID 2>/dev/null; then
        kill $WEB_PID
        print_success "Web preview stopped (PID: $WEB_PID)"
    else
        print_warning "Web preview process not found"
    fi
    rm .web.pid
else
    print_info "No web PID file found"
fi

# Detect docker-compose command
DOCKER_COMPOSE_CMD="docker compose"
if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null 2>&1; then
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
    fi
fi

# Ask about PostgreSQL
echo ""
print_info "PostgreSQL is still running in Docker."
echo ""
echo "Do you want to stop PostgreSQL? (y/N)"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    print_info "Stopping PostgreSQL..."
    $DOCKER_COMPOSE_CMD down
    print_success "PostgreSQL stopped"
else
    print_info "PostgreSQL kept running"
    echo ""
    echo "To stop PostgreSQL later, run:"
    echo "  $DOCKER_COMPOSE_CMD down"
fi

echo ""
print_success "Application stopped"
echo ""
