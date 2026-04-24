#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   AI Hardware IoT Edge AI Platform${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Function to clean up ports
cleanup_ports() {
    echo -e "${YELLOW}Cleaning up ports...${NC}"

    for port in 3000 5001; do
        pid=$(lsof -ti:$port 2>/dev/null)
        if [ ! -z "$pid" ]; then
            echo -e "  Killing process on port $port (PID: $pid)"
            kill -9 $pid 2>/dev/null
        fi
    done

    echo -e "${GREEN}Ports cleaned up!${NC}"
    echo ""
}

# Function to check if PostgreSQL is running
check_postgres() {
    echo -e "${YELLOW}Checking PostgreSQL...${NC}"

    if command -v pg_isready &> /dev/null; then
        if pg_isready -q; then
            echo -e "${GREEN}PostgreSQL is running!${NC}"
            return 0
        fi
    fi

    if psql -U postgres -c '\q' 2>/dev/null; then
        echo -e "${GREEN}PostgreSQL is accessible!${NC}"
        return 0
    fi

    echo -e "${RED}PostgreSQL is not running!${NC}"
    echo -e "${YELLOW}Please start PostgreSQL and try again.${NC}"
    echo -e "  On macOS: brew services start postgresql"
    echo -e "  On Linux: sudo systemctl start postgresql"
    exit 1
}

# Function to create database if it doesn't exist
create_database() {
    echo -e "${YELLOW}Creating database if not exists...${NC}"

    if psql -U postgres -lqt | cut -d \| -f 1 | grep -qw ai_hardware_iot; then
        echo -e "${GREEN}Database 'ai_hardware_iot' already exists!${NC}"
    else
        echo -e "  Creating database 'ai_hardware_iot'..."
        createdb -U postgres ai_hardware_iot 2>/dev/null || psql -U postgres -c "CREATE DATABASE ai_hardware_iot;" 2>/dev/null
        echo -e "${GREEN}Database created!${NC}"
    fi
    echo ""
}

# Function to install dependencies
install_deps() {
    echo -e "${YELLOW}Installing dependencies...${NC}"

    echo -e "  Installing backend dependencies..."
    cd backend
    npm install --silent
    cd ..

    echo -e "  Installing frontend dependencies..."
    cd frontend
    npm install --silent
    cd ..

    echo -e "${GREEN}Dependencies installed!${NC}"
    echo ""
}

# Function to seed data
seed_data() {
    echo -e "${YELLOW}Seeding database with sample data...${NC}"

    cd backend
    node src/seed.js
    cd ..

    echo -e "${GREEN}Database seeded successfully!${NC}"
    echo ""
}

# Function to start servers
start_servers() {
    echo -e "${YELLOW}Starting servers...${NC}"
    echo ""

    echo -e "${BLUE}Starting Backend on port 5001 (with hot reload)...${NC}"
    cd backend
    npm run dev &
    BACKEND_PID=$!
    cd ..

    sleep 3

    echo -e "${BLUE}Starting Frontend on port 3000...${NC}"
    cd frontend
    BROWSER=none npm run dev &
    FRONTEND_PID=$!
    cd ..

    echo ""
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}   Application Started Successfully!${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo ""
    echo -e "  Frontend: ${BLUE}http://localhost:3000${NC}"
    echo -e "  Backend:  ${BLUE}http://localhost:5001${NC}"
    echo ""
    echo -e "  Default Login:"
    echo -e "    Email:    ${YELLOW}admin@iot-platform.com${NC}"
    echo -e "    Password: ${YELLOW}admin123${NC}"
    echo ""
    echo -e "  ${YELLOW}Press Ctrl+C to stop all servers${NC}"
    echo ""

    wait $BACKEND_PID $FRONTEND_PID
}

# Trap Ctrl+C to cleanup
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"

    pkill -P $$

    for port in 3000 5001; do
        pid=$(lsof -ti:$port 2>/dev/null)
        if [ ! -z "$pid" ]; then
            kill -9 $pid 2>/dev/null
        fi
    done

    echo -e "${GREEN}Servers stopped. Goodbye!${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Main execution
main() {
    cd "$(dirname "$0")"

    if [ -f .env ]; then
        export $(cat .env | grep -v '^#' | xargs)
    fi

    cleanup_ports
    check_postgres
    create_database
    install_deps
    seed_data
    start_servers
}

main
