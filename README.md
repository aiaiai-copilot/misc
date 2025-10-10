# misc-poc

## Requirements

- Node.js 22.18.0 (see `.nvmrc`)
- Yarn 3.6.4

## Quick Start

### Production Mode (Recommended)

```bash
# Install the correct Node version
nvm use

# Install dependencies
yarn install

# Start the full application (PostgreSQL + Backend + Web)
yarn start
```

This will start:
- 🗄️  PostgreSQL database (docker-compose)
- 🔌 Backend API server on port 3001
- 🌐 Web application on port 4173

To stop the application:
```bash
yarn stop
# or press Ctrl+C in the terminal where yarn start is running
```

### Development Mode (Frontend Only)

```bash
# Run only the web application (without backend)
yarn dev
```

### Startup Troubleshooting

**Docker not running:**
```bash
# Linux/WSL
sudo service docker start

# SystemD-based systems
sudo systemctl start docker

# Check Docker status
docker info
```

**PostgreSQL not ready:**
```bash
# Check container status
docker ps | grep misc-postgres

# Check PostgreSQL logs
docker logs misc-postgres

# Restart PostgreSQL
docker compose restart postgres
# or for older versions: docker-compose restart postgres
```

**Backend not starting:**
```bash
# Check backend build
yarn build:packages

# Check backend logs (if running separately)
yarn workspace @misc-poc/backend start
```

**Ports are occupied:**
```bash
# Check occupied ports
lsof -i :4173  # Web
lsof -i :3001  # Backend
lsof -i :5432  # PostgreSQL

# Free port (kill process)
kill <PID>
```

## Development Commands

### Main Commands

```bash
# Test all packages (automatically builds dependent packages)
yarn test

# Test without automatic build (faster if packages already built)
yarn test:no-build

# Strict testing (stops on first error)
yarn test:strict

# Lint all packages
yarn lint

# Type-check all packages
yarn typecheck

# Build all packages (including web application)
yarn build

# Build only TypeScript packages (without web application, faster)
yarn build:packages

# Clean all packages
yarn clean
```

### ⚠️ Important: Build Dependencies

This monorepo uses TypeScript workspace references. Some packages depend on the compiled output of other packages:

- `@misc-poc/presentation-web` imports from `@misc-poc/shared`, `@misc-poc/application`, and others
- These packages must be built **before** running web application tests

**Automatic solution:**

- `yarn test` now automatically builds necessary packages
- `yarn dev` automatically builds dependencies before starting

**If you have import errors:**

```bash
yarn build:packages  # Build all TypeScript packages
yarn test            # Now tests should work
```

### Web Application

```bash
# Development server (fast reload, HMR)
yarn workspace @misc-poc/presentation-web dev
# → http://localhost:5173/

# Production preview (built version for testing)
yarn dev  # automatically cleans + builds + starts preview
yarn web:start  # alternative without auto-clean
# → http://localhost:4173/

# Build web application only
yarn workspace @misc-poc/presentation-web build

# Preview server only (after build)
yarn workspace @misc-poc/presentation-web preview

# Test web application
yarn workspace @misc-poc/presentation-web test
```

**⚠️ Node.js v22 compatibility**: Due to changes in Node.js v22 and Buffer API, Vite sometimes cannot properly clean the `dist` folder. The `yarn dev` command now automatically cleans the web package before building to avoid this issue.

### Testing

#### Unit Tests

```bash
# All unit tests (259 tests: shared + domain + other packages)
yarn test

# Individual package tests (use workspace commands)
yarn workspace @misc-poc/shared test  # 229 tests in shared package
yarn workspace @misc-poc/domain test  # 30 tests in domain package (TagNormalizer, etc.)
```

#### E2E Tests (End-to-End)

```bash
# All E2E tests (17 user scenario tests)
yarn test:e2e

# Chromium only (faster)
yarn test:e2e --project=chromium

# With visible browser (for debugging)
yarn test:e2e:headed

# Interactive mode
yarn test:e2e:ui

# Debug mode (step-by-step execution)
yarn test:e2e:debug

# Run specific test
yarn test:e2e --project=chromium --grep "First record creation"
```

**E2E tests cover:**

- 🎯 **First-time use**: Record creation, feedback, empty state
- 📝 **Record management**: CRUD operations, uniqueness, editing
- 🔍 **Search and discovery**: Real-time search, multi-tag logic, tag cloud
- ⌨️ **Keyboard navigation**: Hotkeys, result navigation
- 💾 **Import/Export**: Data persistence and migration

**E2E Troubleshooting:**

```bash
# Check port conflicts (Linux/WSL)
lsof -i :4173

# Check port conflicts (Windows)
netstat -ano | findstr :4173

# Kill process on port 4173
kill <PID>  # Linux/WSL
taskkill /PID <PID> /F  # Windows

# Test server startup manually
yarn test:e2e:server

# Check application availability
curl -I http://localhost:4173/  # Should return HTTP 200
```

**If E2E tests don't work:**

1. ✅ Ensure port 4173 is free
2. ✅ Run `yarn test:e2e:server` to verify build
3. ✅ Open http://localhost:4173/ in browser
4. ✅ Check that input field is visible and focused

### Package-Specific Commands

```bash
# Run tests for specific package
yarn workspace @misc-poc/shared test
yarn workspace @misc-poc/domain test
yarn workspace @misc-poc/application test
yarn workspace @misc-poc/infrastructure-localstorage test
yarn workspace @misc-poc/presentation-cli test  # ❌ No tests found
yarn workspace @misc-poc/presentation-web test

# Run tests with coverage
yarn workspace @misc-poc/shared test --coverage
yarn workspace @misc-poc/domain test --coverage
yarn workspace @misc-poc/application test --coverage
yarn workspace @misc-poc/infrastructure-localstorage test --coverage
yarn workspace @misc-poc/presentation-cli test --coverage
yarn workspace @misc-poc/presentation-web test --coverage

# Lint specific package (eslint installed at root level)
yarn lint  # Lint all packages - recommended
# Or for individual packages:
yarn exec eslint packages/shared/src --ext .ts
yarn exec eslint packages/domain/src --ext .ts
yarn exec eslint packages/application/src --ext .ts
yarn exec eslint packages/infrastructure/localStorage/src --ext .ts
yarn exec eslint packages/presentation/web/src --ext .ts,.tsx

# Type-check specific package
yarn workspace @misc-poc/shared typecheck
yarn workspace @misc-poc/domain typecheck
yarn workspace @misc-poc/application typecheck
yarn workspace @misc-poc/infrastructure-localstorage typecheck
yarn workspace @misc-poc/presentation-cli typecheck
yarn workspace @misc-poc/presentation-web typecheck

# Build specific package
yarn workspace @misc-poc/shared build
yarn workspace @misc-poc/domain build
yarn workspace @misc-poc/application build
yarn workspace @misc-poc/infrastructure-localstorage build
yarn workspace @misc-poc/presentation-cli build
yarn workspace @misc-poc/presentation-web build
```

## Commit Quality Control

The project is configured with automatic quality checks on every commit:

### What is checked automatically

- **ESLint**: Code checking and auto-fixing
- **Prettier**: Code auto-formatting
- **TypeScript**: Type checking
- **Jest**: Running tests (without coverage for speed)
- **TaskMaster**: Task workflow compliance

### Check Sequence

1. ESLint fixes code issues
2. Prettier formats code
3. TypeScript checks types
4. Jest runs tests
5. TaskMaster checks task status
6. Commit is executed only if all checks pass

This ensures high code quality and adherence to project standards.
