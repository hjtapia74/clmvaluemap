#!/bin/bash

# CLM Survey Server Control Script (SQLite Version)
# Usage: ./server.sh [start|stop|restart|status|logs|help]

PID_FILE=".server.pid"
LOG_FILE=".server.log"
DB_FILE="survey.db"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[CLM Survey]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# Function to check if server is running
is_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            return 0
        else
            # PID file exists but process is not running
            rm -f "$PID_FILE"
            return 1
        fi
    else
        return 1
    fi
}

# Function to check SQLite database
check_database() {
    if [ -f "$DB_FILE" ]; then
        DB_SIZE=$(du -h "$DB_FILE" | cut -f1)
        print_info "SQLite database found: $DB_FILE (size: $DB_SIZE)"
    else
        print_info "SQLite database will be created on first run: $DB_FILE"
    fi
}

# Function to start the server
start_server() {
    if is_running; then
        print_warning "Server is already running (PID: $(cat $PID_FILE))"
        print_status "Visit: http://localhost:3000"
        return 0
    fi

    print_status "Starting CLM Survey server (SQLite version)..."

    # Check database status
    check_database

    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        print_warning "Dependencies not installed. Installing..."
        npm install
        if [ $? -ne 0 ]; then
            print_error "Failed to install dependencies"
            return 1
        fi
        print_success "Dependencies installed successfully"
    fi

    # Kill any existing npm run dev processes
    pkill -f "npm run dev" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true

    # Wait a moment for processes to clean up
    sleep 2

    # Start the server in background
    nohup npm run dev > "$LOG_FILE" 2>&1 &
    SERVER_PID=$!

    # Save PID
    echo $SERVER_PID > "$PID_FILE"

    print_status "Waiting for server to start..."

    # Wait for server to be ready (check for up to 30 seconds)
    for i in {1..30}; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            print_success "Server started successfully!"
            print_success "PID: $SERVER_PID"
            print_success "Local: http://localhost:3000"
            print_success "Network: http://$(ipconfig getifaddr en0 2>/dev/null || hostname -I | cut -d' ' -f1):3000"
            print_info "Database: SQLite (local file: $DB_FILE)"
            print_status "Logs: tail -f $LOG_FILE"
            return 0
        fi
        sleep 1
        echo -n "."
    done

    print_error "Server failed to start within 30 seconds"
    print_status "Check logs: cat $LOG_FILE"
    return 1
}

# Function to stop the server
stop_server() {
    if ! is_running; then
        print_warning "Server is not running"
        return 0
    fi

    PID=$(cat "$PID_FILE")
    print_status "Stopping server (PID: $PID)..."

    # Try graceful shutdown first
    kill "$PID" 2>/dev/null

    # Wait for graceful shutdown (up to 10 seconds)
    for i in {1..10}; do
        if ! ps -p "$PID" > /dev/null 2>&1; then
            print_success "Server stopped gracefully"
            rm -f "$PID_FILE"
            return 0
        fi
        sleep 1
    done

    # Force kill if still running
    print_status "Force stopping server..."
    kill -9 "$PID" 2>/dev/null
    rm -f "$PID_FILE"

    # Clean up any remaining processes
    pkill -f "npm run dev" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true

    print_success "Server stopped"
}

# Function to restart the server
restart_server() {
    print_status "Restarting server..."
    stop_server
    sleep 2
    start_server
}

# Function to show server status
show_status() {
    if is_running; then
        PID=$(cat "$PID_FILE")
        print_success "Server is running (PID: $PID)"
        print_status "Local: http://localhost:3000"

        # Show database info
        if [ -f "$DB_FILE" ]; then
            DB_SIZE=$(du -h "$DB_FILE" | cut -f1)
            DB_MODIFIED=$(date -r "$DB_FILE" "+%Y-%m-%d %H:%M:%S")
            print_info "SQLite database: $DB_FILE"
            print_info "  Size: $DB_SIZE"
            print_info "  Last modified: $DB_MODIFIED"
        else
            print_warning "SQLite database not yet created"
        fi

        # Show recent logs
        if [ -f "$LOG_FILE" ]; then
            print_status "Recent logs:"
            tail -n 5 "$LOG_FILE" | sed 's/^/  /'
        fi
    else
        print_warning "Server is not running"
        check_database
    fi
}

# Function to show help
show_help() {
    echo "CLM Survey Server Control Script (SQLite Version)"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start    Start the development server"
    echo "  stop     Stop the development server"
    echo "  restart  Restart the development server"
    echo "  status   Show server status"
    echo "  logs     Show server logs"
    echo "  db       Show database info"
    echo "  clean    Clean up (stop server and remove logs)"
    echo "  help     Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start     # Start the server"
    echo "  $0 stop      # Stop the server"
    echo "  $0 restart   # Restart the server"
    echo "  $0 logs      # View logs in real-time"
    echo "  $0 db        # Show database information"
}

# Function to show logs
show_logs() {
    if [ -f "$LOG_FILE" ]; then
        print_status "Showing server logs (press Ctrl+C to exit):"
        tail -f "$LOG_FILE"
    else
        print_warning "No log file found. Server may not have been started yet."
    fi
}

# Function to show database info
show_database() {
    print_status "SQLite Database Information"
    echo ""

    if [ -f "$DB_FILE" ]; then
        DB_SIZE=$(du -h "$DB_FILE" | cut -f1)
        DB_SIZE_BYTES=$(stat -f%z "$DB_FILE" 2>/dev/null || stat -c%s "$DB_FILE" 2>/dev/null || echo "unknown")
        DB_MODIFIED=$(date -r "$DB_FILE" "+%Y-%m-%d %H:%M:%S")

        print_info "File: $DB_FILE"
        print_info "Size: $DB_SIZE ($DB_SIZE_BYTES bytes)"
        print_info "Last modified: $DB_MODIFIED"

        # Try to get table count if sqlite3 is available
        if command -v sqlite3 &> /dev/null; then
            TABLE_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "unknown")
            if [ "$TABLE_COUNT" != "unknown" ]; then
                print_info "Tables: $TABLE_COUNT"

                # Show session count
                SESSION_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM survey_sessions;" 2>/dev/null || echo "0")
                RESPONSE_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM survey_responses;" 2>/dev/null || echo "0")

                print_info "Survey sessions: $SESSION_COUNT"
                print_info "Survey responses: $RESPONSE_COUNT"
            fi
        else
            print_warning "sqlite3 command not available - install it for detailed database info"
        fi
    else
        print_warning "Database file not found: $DB_FILE"
        print_info "The database will be created automatically when the server starts"
    fi
}

# Function to clean up
clean_up() {
    print_status "Cleaning up..."

    # Stop server if running
    if is_running; then
        stop_server
    fi

    # Remove log file
    if [ -f "$LOG_FILE" ]; then
        rm -f "$LOG_FILE"
        print_success "Removed log file"
    fi

    # Remove PID file
    if [ -f "$PID_FILE" ]; then
        rm -f "$PID_FILE"
        print_success "Removed PID file"
    fi

    print_warning "Note: SQLite database ($DB_FILE) was NOT removed"
    print_info "To remove database, run: rm $DB_FILE"
}

# Main script logic
case "${1:-help}" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        restart_server
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    db|database)
        show_database
        ;;
    clean)
        clean_up
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac