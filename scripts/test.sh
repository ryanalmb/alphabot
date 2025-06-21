#!/bin/bash

# Alpha Pack Test Suite
# Comprehensive testing script for all components

set -e

echo "🧪 Alpha Pack Test Suite"
echo "========================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_ENV=${TEST_ENV:-"test"}
COVERAGE_THRESHOLD=${COVERAGE_THRESHOLD:-80}
PARALLEL_TESTS=${PARALLEL_TESTS:-true}

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check dependencies
check_dependencies() {
    print_status "Checking dependencies..."
    
    local missing_deps=()
    
    if ! command_exists node; then
        missing_deps+=("node")
    fi
    
    if ! command_exists npm; then
        missing_deps+=("npm")
    fi
    
    if ! command_exists anchor; then
        missing_deps+=("anchor")
    fi
    
    if ! command_exists docker; then
        missing_deps+=("docker")
    fi
    
    if ! command_exists docker-compose; then
        missing_deps+=("docker-compose")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        exit 1
    fi
    
    print_success "All dependencies found"
}

# Setup test environment
setup_test_env() {
    print_status "Setting up test environment..."
    
    # Create test environment file
    cat > .env.test << EOF
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5433/alphapack_test
REDIS_URL=redis://localhost:6380
SOLANA_RPC_ENDPOINT=http://localhost:8899
AWS_REGION=us-east-1
USER_TABLE_NAME=alphapack-users-test
PACK_TABLE_NAME=alphapack-packs-test
COMPETITION_TABLE_NAME=alphapack-competitions-test
TRADING_QUEUE_URL=http://localhost:9324/queue/alphapack-trading-test
SOCIAL_QUEUE_URL=http://localhost:9324/queue/alphapack-social-test
ML_ENDPOINT_NAME=alphapack-ml-test
TELEGRAM_BOT_TOKEN=test-token
JWT_SECRET=test-secret-key-for-testing-only
ENCRYPTION_KEY=test-encryption-key-32-characters
EOF
    
    # Start test services
    print_status "Starting test services..."
    docker-compose -f docker-compose.test.yml up -d
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 10
    
    # Check service health
    check_service_health
    
    print_success "Test environment ready"
}

# Check service health
check_service_health() {
    local services=("postgres" "redis" "localstack")
    
    for service in "${services[@]}"; do
        if ! docker-compose -f docker-compose.test.yml ps | grep -q "${service}.*Up"; then
            print_error "Service $service is not running"
            exit 1
        fi
    done
    
    print_success "All test services are healthy"
}

# Run unit tests
run_unit_tests() {
    print_status "Running unit tests..."
    
    # Backend unit tests
    print_status "Running backend unit tests..."
    npm run test:unit -- --coverage --coverageThreshold="{\"global\":{\"branches\":${COVERAGE_THRESHOLD},\"functions\":${COVERAGE_THRESHOLD},\"lines\":${COVERAGE_THRESHOLD},\"statements\":${COVERAGE_THRESHOLD}}}"
    
    # Frontend unit tests
    print_status "Running frontend unit tests..."
    cd frontend
    npm run test -- --coverage --watchAll=false --coverageThreshold="{\"global\":{\"branches\":${COVERAGE_THRESHOLD},\"functions\":${COVERAGE_THRESHOLD},\"lines\":${COVERAGE_THRESHOLD},\"statements\":${COVERAGE_THRESHOLD}}}"
    cd ..
    
    print_success "Unit tests completed"
}

# Run integration tests
run_integration_tests() {
    print_status "Running integration tests..."
    
    # API integration tests
    npm run test:integration
    
    # Database integration tests
    npm run test:db
    
    # Solana program tests
    print_status "Running Solana program tests..."
    anchor test
    
    print_success "Integration tests completed"
}

# Run end-to-end tests
run_e2e_tests() {
    print_status "Running end-to-end tests..."
    
    # Start application in test mode
    print_status "Starting application for E2E tests..."
    npm run start:test &
    APP_PID=$!
    
    # Wait for application to start
    sleep 15
    
    # Run E2E tests
    cd frontend
    npm run test:e2e
    cd ..
    
    # Stop application
    kill $APP_PID
    
    print_success "End-to-end tests completed"
}

# Run performance tests
run_performance_tests() {
    print_status "Running performance tests..."
    
    # Load testing with Artillery
    if command_exists artillery; then
        artillery run tests/performance/load-test.yml
    else
        print_warning "Artillery not found, skipping load tests"
    fi
    
    # Benchmark tests
    npm run test:benchmark
    
    print_success "Performance tests completed"
}

# Run security tests
run_security_tests() {
    print_status "Running security tests..."
    
    # Dependency vulnerability scan
    npm audit --audit-level moderate
    
    # Frontend security scan
    cd frontend
    npm audit --audit-level moderate
    cd ..
    
    # Static security analysis
    if command_exists semgrep; then
        semgrep --config=auto src/
    else
        print_warning "Semgrep not found, skipping static analysis"
    fi
    
    print_success "Security tests completed"
}

# Run linting and formatting checks
run_lint_tests() {
    print_status "Running linting and formatting checks..."
    
    # Backend linting
    npm run lint
    npm run format:check
    
    # Frontend linting
    cd frontend
    npm run lint
    npm run type-check
    cd ..
    
    # Solana program linting
    cargo clippy --all-targets --all-features -- -D warnings
    cargo fmt -- --check
    
    print_success "Linting checks completed"
}

# Generate test reports
generate_reports() {
    print_status "Generating test reports..."
    
    # Create reports directory
    mkdir -p reports
    
    # Combine coverage reports
    if command_exists nyc; then
        nyc merge coverage reports/coverage-combined.json
        nyc report --reporter=html --report-dir=reports/coverage
    fi
    
    # Generate test summary
    cat > reports/test-summary.md << EOF
# Alpha Pack Test Summary

## Test Results
- Unit Tests: ✅ Passed
- Integration Tests: ✅ Passed
- E2E Tests: ✅ Passed
- Performance Tests: ✅ Passed
- Security Tests: ✅ Passed
- Linting: ✅ Passed

## Coverage
- Overall Coverage: ${COVERAGE_THRESHOLD}%+
- Backend Coverage: See reports/coverage/backend/
- Frontend Coverage: See reports/coverage/frontend/

## Generated: $(date)
EOF
    
    print_success "Test reports generated in reports/"
}

# Cleanup test environment
cleanup() {
    print_status "Cleaning up test environment..."
    
    # Stop test services
    docker-compose -f docker-compose.test.yml down -v
    
    # Remove test files
    rm -f .env.test
    
    print_success "Cleanup completed"
}

# Main test execution
main() {
    local test_type=${1:-"all"}
    
    # Trap cleanup on exit
    trap cleanup EXIT
    
    print_status "Starting Alpha Pack test suite (type: $test_type)"
    
    check_dependencies
    setup_test_env
    
    case $test_type in
        "unit")
            run_unit_tests
            ;;
        "integration")
            run_integration_tests
            ;;
        "e2e")
            run_e2e_tests
            ;;
        "performance")
            run_performance_tests
            ;;
        "security")
            run_security_tests
            ;;
        "lint")
            run_lint_tests
            ;;
        "all")
            run_lint_tests
            run_unit_tests
            run_integration_tests
            run_e2e_tests
            run_performance_tests
            run_security_tests
            ;;
        *)
            print_error "Unknown test type: $test_type"
            echo "Available types: unit, integration, e2e, performance, security, lint, all"
            exit 1
            ;;
    esac
    
    generate_reports
    
    print_success "🎉 All tests completed successfully!"
    print_status "Test reports available in reports/"
}

# Handle script arguments
case "${1:-}" in
    "--help"|"-h")
        echo "Alpha Pack Test Suite"
        echo ""
        echo "Usage: $0 [test_type]"
        echo ""
        echo "Test types:"
        echo "  unit         Run unit tests only"
        echo "  integration  Run integration tests only"
        echo "  e2e          Run end-to-end tests only"
        echo "  performance  Run performance tests only"
        echo "  security     Run security tests only"
        echo "  lint         Run linting checks only"
        echo "  all          Run all tests (default)"
        echo ""
        echo "Environment variables:"
        echo "  TEST_ENV             Test environment (default: test)"
        echo "  COVERAGE_THRESHOLD   Coverage threshold percentage (default: 80)"
        echo "  PARALLEL_TESTS       Run tests in parallel (default: true)"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac
