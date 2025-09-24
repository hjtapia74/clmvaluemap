#!/bin/bash

# Bus Error Debug Script for CLM Survey Application
# This script diagnoses bus errors during npm build on EC2

echo "=================================================================="
echo "🔍 CLM Survey Bus Error Diagnostic Script"
echo "=================================================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_section() {
    echo -e "${BLUE}📋 $1${NC}"
    echo "----------------------------------------"
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

print_section "1. System Information"
echo "Hostname: $(hostname)"
echo "Kernel: $(uname -r)"
echo "Architecture: $(uname -m)"
echo "OS: $(cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d'"' -f2 || echo 'Unknown')"
echo "Uptime: $(uptime | cut -d',' -f1)"
echo ""

print_section "2. Hardware Information"
echo "CPU Info:"
grep -E "model name|processor|cores" /proc/cpuinfo | head -4
echo ""
echo "Memory Info:"
free -h
echo ""
echo "Disk Info:"
df -h / | tail -1
echo ""

# Check for hardware errors
print_section "3. Hardware Error Check"
BUS_ERRORS=$(sudo dmesg 2>/dev/null | grep -i "bus error\|hardware error\|mce:" | wc -l)
if [ "$BUS_ERRORS" -gt 0 ]; then
    print_error "Found $BUS_ERRORS hardware-related errors in dmesg:"
    sudo dmesg | grep -i "bus error\|hardware error\|mce:" | tail -5
else
    print_success "No hardware errors found in dmesg"
fi
echo ""

print_section "4. Node.js Environment"
echo "Node.js version: $(node --version 2>/dev/null || echo 'Not installed')"
echo "npm version: $(npm --version 2>/dev/null || echo 'Not installed')"
echo "Node.js executable: $(which node 2>/dev/null || echo 'Not found')"
echo "npm executable: $(which npm 2>/dev/null || echo 'Not found')"
echo ""

# Test Node.js functionality
echo "Node.js basic test:"
if node -e "console.log('✅ Node.js basic test passed')" 2>/dev/null; then
    print_success "Node.js basic functionality working"
else
    print_error "Node.js basic test failed"
fi
echo ""

print_section "5. Application Directory Analysis"
if [ -d "/var/www/clm-survey" ]; then
    cd /var/www/clm-survey
    print_success "Application directory found: /var/www/clm-survey"

    echo "Directory contents:"
    ls -la | head -10
    echo ""

    echo "Package.json exists: $([ -f package.json ] && echo 'Yes' || echo 'No')"
    echo "node_modules exists: $([ -d node_modules ] && echo 'Yes' || echo 'No')"
    echo ".next exists: $([ -d .next ] && echo 'Yes (built)' || echo 'No (not built)')"
    echo ""

    if [ -f package.json ]; then
        echo "Package.json preview:"
        head -15 package.json
        echo ""
    fi
else
    print_error "Application directory /var/www/clm-survey not found!"
    cd /home/ec2-user
fi
echo ""

print_section "6. Dependencies and Native Modules Check"
if [ -d "/var/www/clm-survey/node_modules" ]; then
    cd /var/www/clm-survey

    echo "Native modules (.node files):"
    NATIVE_MODULES=$(find node_modules -name "*.node" 2>/dev/null | wc -l)
    if [ "$NATIVE_MODULES" -gt 0 ]; then
        print_warning "Found $NATIVE_MODULES native modules:"
        find node_modules -name "*.node" 2>/dev/null | head -5
    else
        print_success "No native modules found"
    fi
    echo ""

    # Test better-sqlite3 specifically
    echo "SQLite3 module test:"
    if node -e "try { require('better-sqlite3'); console.log('✅ better-sqlite3 loads correctly'); } catch(e) { console.log('❌ better-sqlite3 error:', e.message); }" 2>/dev/null; then
        print_success "SQLite module working"
    else
        print_error "SQLite module has issues"
    fi
    echo ""
else
    print_warning "node_modules directory not found"
fi

print_section "7. Next.js Environment Check"
cd /var/www/clm-survey 2>/dev/null || cd /home/ec2-user

echo "Next.js info:"
if command -v npx >/dev/null 2>&1; then
    npx next info 2>/dev/null || print_warning "Next.js info command failed"
else
    print_warning "npx not available"
fi
echo ""

echo "Next.js configuration:"
if [ -f "next.config.js" ]; then
    echo "next.config.js found:"
    cat next.config.js
elif [ -f "next.config.mjs" ]; then
    echo "next.config.mjs found:"
    cat next.config.mjs
else
    print_warning "No Next.js config file found"
fi
echo ""

print_section "8. Memory and Swap Analysis"
echo "Memory usage:"
free -h
echo ""

echo "Swap status:"
swapon --show 2>/dev/null || echo "No swap configured"
echo ""

echo "Available memory for Node.js:"
AVAILABLE_KB=$(awk '/MemAvailable/ { print $2 }' /proc/meminfo 2>/dev/null || echo "0")
AVAILABLE_MB=$((AVAILABLE_KB / 1024))
echo "Available memory: ${AVAILABLE_MB}MB"

if [ "$AVAILABLE_MB" -lt 512 ]; then
    print_error "Very low available memory (${AVAILABLE_MB}MB)"
elif [ "$AVAILABLE_MB" -lt 1024 ]; then
    print_warning "Low available memory (${AVAILABLE_MB}MB)"
else
    print_success "Adequate available memory (${AVAILABLE_MB}MB)"
fi
echo ""

print_section "9. Process and Load Analysis"
echo "Current load average:"
uptime
echo ""

echo "Top memory consumers:"
ps aux --sort=-%mem | head -6
echo ""

echo "Node.js processes currently running:"
ps aux | grep node | grep -v grep || echo "No Node.js processes found"
echo ""

print_section "10. Build Test with Detailed Logging"
if [ -d "/var/www/clm-survey" ] && [ -f "/var/www/clm-survey/package.json" ]; then
    cd /var/www/clm-survey

    echo "Testing TypeScript compilation first:"
    if sudo -u ec2-user timeout 30 npx tsc --noEmit 2>&1; then
        print_success "TypeScript compilation test passed"
    else
        print_error "TypeScript compilation test failed or timed out"
    fi
    echo ""

    echo "Testing Next.js build with verbose logging:"
    echo "Command: NODE_OPTIONS='--trace-warnings --max-old-space-size=1024' npm run build"

    # Capture both stdout and stderr
    if timeout 120 sudo -u ec2-user NODE_OPTIONS='--trace-warnings --max-old-space-size=1024' npm run build > build-test.log 2>&1; then
        print_success "Build test completed successfully"
        echo "Build output (last 10 lines):"
        tail -10 build-test.log
    else
        EXIT_CODE=$?
        print_error "Build test failed with exit code: $EXIT_CODE"
        echo "Build output (last 20 lines):"
        tail -20 build-test.log 2>/dev/null || echo "No build log available"

        # Check for specific error patterns
        echo ""
        echo "Error analysis:"
        if grep -q "Bus error" build-test.log 2>/dev/null; then
            print_error "Bus error detected in build log"
        fi
        if grep -q "Segmentation fault" build-test.log 2>/dev/null; then
            print_error "Segmentation fault detected in build log"
        fi
        if grep -q "out of memory" build-test.log 2>/dev/null; then
            print_error "Out of memory error detected in build log"
        fi
        if grep -q "SIGKILL" build-test.log 2>/dev/null; then
            print_error "Process was killed (likely by OOM killer)"
        fi
    fi
else
    print_warning "Skipping build test - application directory or package.json not found"
fi
echo ""

print_section "11. System Resources During Test"
echo "Memory usage after test:"
free -h
echo ""

echo "Disk usage:"
df -h /var/www 2>/dev/null || df -h /
echo ""

print_section "12. Recommendations"
echo "Based on the analysis above, here are the recommended next steps:"
echo ""

# Generate recommendations based on findings
if [ "$AVAILABLE_MB" -lt 1024 ]; then
    echo "🔧 MEMORY: Consider adding more swap space or upgrading instance size"
fi

if [ "$BUS_ERRORS" -gt 0 ]; then
    echo "🔧 HARDWARE: Hardware errors detected - consider launching a new instance"
fi

if [ ! -d "/var/www/clm-survey/node_modules" ]; then
    echo "🔧 DEPENDENCIES: Run 'npm install' to install missing dependencies"
fi

if [ "$NATIVE_MODULES" -gt 0 ]; then
    echo "🔧 NATIVE MODULES: Try rebuilding native modules with 'npm rebuild'"
fi

echo "🔧 ALTERNATIVE: Try building in development mode: 'npm run dev'"
echo "🔧 FALLBACK: Use pre-built version or build on a more powerful machine"
echo ""

print_section "Diagnostic Complete"
echo "Log files created:"
echo "- build-test.log (if build was attempted)"
echo ""
echo "To share this output, run:"
echo "curl -fsSL https://raw.githubusercontent.com/hjtapia74/clmvaluemap/main/deploy/debug-bus-error.sh | bash > debug-output.txt 2>&1"
echo "=================================================================="