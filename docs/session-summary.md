# Session Summary: MISC MVP Simplification

**Date**: 2025-10-02
**Context**: Transition from complex MVP to simplified PostgreSQL-based single-user version

## What Happened

### Background

User decided that the original MVP plan (from `docs/taskmaster/prd-mvp.md`) became too complex and time-consuming. The project needed simplification to achieve faster results.

### Key Decisions Made

#### Starting Point

- **Branch created from**: commit `b9079a7`
- **Branch name**: `new-mvp-preparing`
- **This commit already contained**: `docs/taskmaster/prd-mvp.md` and `tasks.json` generated from complex requirements

#### What Was Removed (Simplifications)

1. **Authentication**: No OAuth, no JWT, no multi-user support → **single-user local app**
2. **Docker complexity**: Removed Nginx, complex deployment → **Only PostgreSQL in Docker**
3. **Security**: No SSL, no Let's Encrypt, no HSTS, no rate limiting → **local development only**
4. **User management**: No `users` table, no `user_id` in records, no `user_settings` table
5. **Settings**: No dynamic user settings → **fixed configuration**
6. **Export/Import**: Removed `/api/export` and `/api/import` endpoints → **future feature**
7. **Migrations**: No TypeORM migrations → **simple SQL init script**
8. **Validation libraries**: No Joi/Zod → **existing domain validation only**
9. **TDD strictness**: Relaxed TDD requirements → **pragmatic testing for MVP**
10. **Performance metrics**: Removed specific targets (100 users, 50 req/s) → **not critical for single-user**
11. **Timeline**: Removed 10-week phases → **simplified incremental approach**

#### What Was Kept

1. **PostgreSQL**: Still using PostgreSQL (in Docker) instead of localStorage
2. **Clean Architecture**: Maintaining existing structure (Domain, Application, Infrastructure, Presentation)
3. **Monorepo**: Keeping yarn workspaces structure (`packages/*`)
4. **E2E Tests**: Playwright tests already exist and work
5. **Existing domain logic**: All business rules preserved
6. **Minimal UI**: Same philosophy of radical simplicity
7. **Core API endpoints**:
   - `GET /api/records` (search/list)
   - `POST /api/records` (create)
   - `PUT /api/records/:id` (update)
   - `DELETE /api/records/:id` (delete)
   - `GET /api/tags` (statistics)

### Current State

#### Repository Structure

```
misc-poc/
├── packages/
│   ├── domain/          # Existing business logic (unchanged)
│   ├── application/     # Existing use cases (unchanged)
│   ├── infrastructure/  # Will add postgresql/ subdirectory
│   ├── presentation/    # Existing React UI
│   ├── backend/         # NEW: Will create Express server
│   └── shared/          # Existing shared code
├── e2e/                 # Existing Playwright tests
├── docs/
│   ├── taskmaster/
│   │   ├── prd-mvp.md       # Original complex requirements
│   │   └── prd-simplified.md # NEW: Simplified requirements
│   └── session-summary.md   # This file
├── .taskmaster/
│   ├── tasks/tasks.json     # Generated from OLD complex PRD
│   └── docs/prd.txt         # OLD complex requirements
└── docker-compose.yml       # To be created (PostgreSQL only)
```

#### Branch Status

- **Current branch**: `new-mvp-preparing` (created from `b9079a7`)
- **Status**: Clean working directory
- **Remote**: Not yet pushed

### Deliverables Created

1. **docs/taskmaster/prd-simplified.md** - Complete simplified requirements document
2. **docs/session-summary.md** - This context document

### Next Steps (for New Repository)

#### Immediate Tasks

1. Create new GitHub repository: `misc` under `aiaiai-copilot` account
2. Push `new-mvp-preparing` branch as `main` to new repo
3. Start new session in new repository

#### Implementation Order

1. **Backend Setup**
   - Create `packages/backend` with Express
   - Setup CORS for localhost:3000
   - Basic error handling

2. **PostgreSQL Infrastructure**
   - Create `docker-compose.yml` (PostgreSQL only)
   - Create `packages/infrastructure/postgresql/`
   - Implement `PostgresRecordRepository`
   - Write `init.sql` script

3. **API Implementation**
   - Implement 5 core endpoints
   - Request/response handling
   - Error handling

4. **Frontend Integration**
   - Create API client
   - Replace localStorage with API calls
   - Add loading states
   - Error notifications

5. **Testing**
   - Update E2E tests for API
   - Integration tests for repository
   - End-to-end verification

## Technical Details

### Database Schema (Simplified)

```sql
CREATE TABLE records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  tags TEXT[] NOT NULL,
  normalized_tags TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(normalized_tags)
);

CREATE INDEX idx_records_normalized_tags ON records USING GIN(normalized_tags);
CREATE INDEX idx_records_created_at ON records(created_at DESC);
```

**Key simplifications**:

- No `users` table
- No `user_id` foreign key
- No `user_settings` table
- Single-user system

### Fixed Configuration

```typescript
const SETTINGS = {
  caseSensitive: false,
  removeAccents: true,
  maxTagLength: 100,
  maxTagsPerRecord: 50,
};
```

### Docker Setup

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    ports:
      - '5432:5432'
    environment:
      - POSTGRES_USER=misc
      - POSTGRES_PASSWORD=misc
      - POSTGRES_DB=misc
    volumes:
      - ./data:/var/lib/postgresql/data
```

### User Startup Flow

```bash
# 1. Start PostgreSQL (one time)
docker-compose up -d

# 2. Start application
npm start
```

### Architecture Preserved

```
Web Client (localhost:3000)
    ↓
REST API (localhost:3001)
    ↓
Business Logic (Domain + Application)
    ↓
PostgreSQL Repository
    ↓
PostgreSQL (Docker container)
```

## Important Context for Continuation

### Philosophy to Maintain

- **Radical simplicity**: Everything is tags
- **Zero friction**: Instant capture and search
- **No structure**: User freedom in organization
- **Speed over formality**: Quick thought capture

### Code Already Exists

- Domain layer: Record, Tag entities, validation, normalization
- Application layer: Use cases, ports, adapters
- Presentation layer: React UI with Playwright E2E tests
- Infrastructure: Currently localStorage-based

### What Needs to Be Created

- Express backend server (`packages/backend`)
- PostgreSQL repository (`packages/infrastructure/postgresql`)
- API client for frontend
- Docker Compose configuration
- Database initialization script
- Updated E2E tests for API-based persistence

### TaskMaster Workflow

- **Current tasks.json**: Generated from OLD complex PRD
- **Next step**: Will need to generate NEW tasks.json from `prd-simplified.md`
- **Command**: `task-master parse-prd docs/taskmaster/prd-simplified.md --append` or create fresh

### Testing Strategy

- Keep existing domain/use case tests (they should still pass)
- Add integration tests for PostgresRecordRepository
- Update E2E tests to work with backend API
- Pragmatic approach: test what matters, not 95%+ coverage requirement

## Migration Path (Big Picture)

1. **Prototype** (completed): localStorage, single-user, local
2. **Simplified MVP** (this effort): PostgreSQL, single-user, local ← **WE ARE HERE**
3. **Full MVP** (future): PostgreSQL, multi-user, authentication
4. **Production** (future): Deployed with security, SSL, monitoring

## References

### Key Documents

- `docs/taskmaster/prd-simplified.md` - Complete simplified requirements
- `docs/taskmaster/prd-mvp.md` - Original complex requirements (for reference)
- `e2e/README.md` - E2E testing guidelines
- `CLAUDE.md` - Project standards (TDD, testing, workflow)

### Important Commits

- `b9079a7` - Base commit where simplification started
- `320e654` - Earlier commit where prd-mvp.md was created (not used)

### Repository Information

- **Source repo**: `misc-poc` (stays untouched, will be useful for reference)
- **New repo**: `misc` (fresh start with simplified approach)
- **GitHub account**: `aiaiai-copilot`

## Questions for New Session

When continuing in the new repository, consider:

1. Should we generate fresh `tasks.json` from simplified PRD or keep some tasks?
2. What's the first package to implement - backend or postgresql infrastructure?
3. Should we keep the same monorepo package structure or simplify further?
4. Do we want to preserve git history from `misc-poc` or start fresh?

## Critical Notes

⚠️ **DO NOT** confuse this with the original `misc-poc` repo - that stays intact
⚠️ The new `misc` repo is a **fresh start** with simplified requirements
⚠️ Focus on **PostgreSQL replacement of localStorage** - that's the core goal
⚠️ Everything else (auth, multi-user, deployment) is **future work**

---

**For the AI assistant continuing this work**: Read `docs/taskmaster/prd-simplified.md` for complete technical requirements. This summary provides the decision-making context and rationale.
