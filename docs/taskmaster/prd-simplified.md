# MISC (MindSection) - Simplified MVP Requirements

## Executive Summary

This document defines requirements for transitioning MISC from localStorage to PostgreSQL persistence while maintaining single-user local deployment. This is a simplified intermediate step before full multi-user MVP.

## 1. Product Vision and Philosophy

### 1.1. Philosophy

MISC is a minimalist information management system based on a single principle: everything is tags. Each record is simply a set of words separated by spaces. Each word is simultaneously both content and a way to find that content. The system eliminates the barrier between thought and recording, offering instant capture and search of information without traditional data organization structures.

### 1.2. Key Product Principles

1. **Radical simplicity**: One mechanism for all types of information
2. **Zero entry barrier**: Requires no learning
3. **Speed priority**: Instant thought capture
4. **Transparency**: User always understands how the system works
5. **No structure - there is freedom**: User decides how to interpret their records

## 2. Project Context

### 2.1 Current State (Prototype)

- Local storage-based single-user application
- Clean Architecture implementation (Domain, Application, Infrastructure, Presentation)
- TypeScript monorepo with yarn workspaces
- Comprehensive test coverage (Domain >95%, Use Cases >90%)
- Working web interface with instant search and tag management
- E2E tests with Playwright

### 2.2 Simplified MVP Goals

- Replace localStorage with PostgreSQL persistence
- Maintain single-user local deployment
- Keep existing simplicity and user experience
- Enable data persistence and reliability
- Preserve all existing business logic

### 2.3 Key Constraints

- Preserve all existing business logic
- Maintain Clean Architecture principles
- Keep the same minimal UI philosophy
- Single-user deployment (no authentication)
- Local development environment

### 2.4 What We're NOT Doing (Future Features)

- Multi-user support
- Authentication (OAuth, JWT)
- Complex deployment (Nginx, SSL, production infrastructure)
- Rate limiting and security hardening
- Performance optimization for concurrent users

## 3. Technical Architecture

### 3.1 Technology Stack

```yaml
Backend:
  Runtime: Node.js 22.x
  Language: TypeScript 5.x
  Framework: Express
  Database: PostgreSQL 15+
  Migrations: Simple SQL init script

Infrastructure:
  Database Container: Docker Compose (PostgreSQL only)

Development:
  Testing: Jest (existing)
  E2E Testing: Playwright (existing)
  Code Quality: ESLint, Prettier (existing)
```

### 3.2 System Architecture

```
┌─────────────────┐
│   Web Client    │ (localhost:3000)
│   (React SPA)   │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   REST API      │ (localhost:3001)
│   (Express)     │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   Business      │
│   Logic         │
│ (Domain + App)  │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   PostgreSQL    │ (Docker container)
│   Repository    │
└─────────────────┘
```

### 3.3 Deployment Setup

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

volumes:
  postgres_data:
```

**User startup:**

1. `docker-compose up -d` (start PostgreSQL)
2. `npm start` (start application)

## 4. Functional Requirements

### 4.1 Data Model

#### 4.1.1 Database Schema

```sql
-- Records table (no users, single-user system)
CREATE TABLE records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  tags TEXT[] NOT NULL,
  normalized_tags TEXT[] NOT NULL, -- for search
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique normalized tags
  UNIQUE(normalized_tags)
);

-- Indexes for performance
CREATE INDEX idx_records_normalized_tags ON records USING GIN(normalized_tags);
CREATE INDEX idx_records_created_at ON records(created_at DESC);
```

#### 4.1.2 Fixed Settings

Since this is single-user, settings are fixed (no user_settings table):

```typescript
const SETTINGS = {
  caseSensitive: false,
  removeAccents: true,
  maxTagLength: 100,
  maxTagsPerRecord: 50,
};
```

#### 4.1.3 Database Initialization

Simple SQL initialization script instead of TypeORM migrations:

```sql
-- init.sql
CREATE TABLE IF NOT EXISTS records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  tags TEXT[] NOT NULL,
  normalized_tags TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(normalized_tags)
);

CREATE INDEX IF NOT EXISTS idx_records_normalized_tags
  ON records USING GIN(normalized_tags);

CREATE INDEX IF NOT EXISTS idx_records_created_at
  ON records(created_at DESC);
```

### 4.2 REST API Specification

#### 4.2.1 API Endpoints

```yaml
paths:
  /api/records:
    get:
      summary: Search records
      parameters:
        - name: q
          in: query
          schema:
            type: string
          description: Space-separated tags to search
        - name: limit
          in: query
          schema:
            type: integer
            default: 100
        - name: offset
          in: query
          schema:
            type: integer
            default: 0
      responses:
        200:
          description: Search results
          content:
            application/json:
              schema:
                type: object
                properties:
                  records:
                    type: array
                    items:
                      $ref: '#/components/schemas/Record'
                  total:
                    type: integer

    post:
      summary: Create new record
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                content:
                  type: string
                  example: 'meeting project alpha 15:00'
      responses:
        201:
          description: Record created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Record'

  /api/records/{id}:
    put:
      summary: Update record
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                content:
                  type: string
      responses:
        200:
          description: Record updated

    delete:
      summary: Delete record
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        204:
          description: Record deleted

  /api/tags:
    get:
      summary: Get tag statistics
      responses:
        200:
          description: Tag cloud data
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    tag:
                      type: string
                    count:
                      type: integer
```

**NOT included in simplified MVP:**

- `/api/export` - Export functionality (future)
- `/api/import` - Import functionality (future)

### 4.3 Business Logic Preservation

#### 4.3.1 Domain Layer (Unchanged)

Existing domain entities remain unchanged:

- Record entity with tag extraction
- Tag normalization services
- Content validation rules
- Tag order preservation logic

#### 4.3.2 Repository Interface

```typescript
// Existing interface in application/ports
interface IRecordRepository {
  save(record: Record): Promise<Record>;
  findByTags(tags: Tag[]): Promise<Record[]>;
  findById(id: RecordId): Promise<Record | null>;
  delete(id: RecordId): Promise<void>;
  getTagStatistics(): Promise<Array<{ tag: string; count: number }>>;
}
```

New implementation:

- Create `PostgresRecordRepository` in `packages/infrastructure/postgresql/`
- Replace `LocalStorageRecordRepository` usage in application container

### 4.4 Frontend Adaptation

#### 4.4.1 API Client

Create API client to replace direct localStorage access:

```typescript
class RecordsApiClient {
  async search(query: string): Promise<Record[]>;
  async create(content: string): Promise<Record>;
  async update(id: string, content: string): Promise<Record>;
  async delete(id: string): Promise<void>;
  async getTagStatistics(): Promise<TagStats[]>;
}
```

#### 4.4.2 State Management Changes

- Replace localStorage persistence with API calls
- Add loading states for async operations
- Add error handling for network failures
- Keep existing UI components unchanged

## 5. Implementation Tasks

### 5.1 Backend Setup

1. Create `packages/backend` package
   - Express server setup
   - CORS configuration for localhost:3000
   - Error handling middleware

2. Create `packages/infrastructure/postgresql`
   - PostgreSQL connection setup
   - `PostgresRecordRepository` implementation
   - Database initialization script

3. API Routes
   - `GET /api/records` - search/list
   - `POST /api/records` - create
   - `PUT /api/records/:id` - update
   - `DELETE /api/records/:id` - delete
   - `GET /api/tags` - statistics

### 5.2 Database Setup

1. Docker Compose configuration
2. PostgreSQL initialization script
3. Connection pool configuration
4. Error handling for database operations

### 5.3 Frontend Integration

1. Create API client in `packages/presentation/web`
2. Replace localStorage calls with API calls
3. Add loading states
4. Add error notifications
5. Update E2E tests for API-based persistence

### 5.4 Testing

1. Existing tests should continue to pass (domain, use cases)
2. Add integration tests for PostgresRecordRepository
3. Update E2E tests to work with backend API
4. Test database initialization and connection handling

## 6. Development Phases

### Phase 1: Backend Foundation

- Setup Express server
- Configure CORS
- Create basic API structure
- Setup PostgreSQL with Docker Compose

### Phase 2: PostgreSQL Repository

- Implement PostgresRecordRepository
- Database initialization script
- Integration tests for repository
- Connection pool configuration

### Phase 3: API Implementation

- Implement all CRUD endpoints
- Request/response validation
- Error handling
- API testing

### Phase 4: Frontend Integration

- Create API client
- Replace localStorage with API calls
- Add loading states
- Update error handling

### Phase 5: Testing & Polish

- Update E2E tests
- End-to-end testing
- Bug fixes
- Documentation

## 7. Acceptance Criteria

### 7.1 Functional Criteria

```yaml
Data Persistence: ✓ Records are stored in PostgreSQL
  ✓ All CRUD operations work correctly
  ✓ Search returns accurate results
  ✓ Tag normalization works as specified
  ✓ Data persists across application restarts

API: ✓ All endpoints return correct responses
  ✓ Proper error handling
  ✓ CORS configured for local development

Frontend: ✓ UI functionality unchanged from user perspective
  ✓ Loading states during API calls
  ✓ Error notifications on failures
  ✓ All existing features work
```

### 7.2 Technical Criteria

```yaml
Architecture: ✓ Clean Architecture maintained
  ✓ Domain logic unchanged
  ✓ Repository pattern implemented
  ✓ Monorepo structure preserved

Testing: ✓ Existing tests still pass
  ✓ E2E tests updated and passing
  ✓ PostgreSQL repository tested

Deployment: ✓ docker-compose up -d starts PostgreSQL
  ✓ npm start launches application
  ✓ Simple setup for local development
```

## 8. Future Enhancements (Not in This MVP)

- Multi-user support with authentication
- Import/export functionality
- Production deployment with Nginx, SSL
- Performance optimization
- Advanced security features
- Backup and restore tools
- Migration from localStorage data

## 9. Migration Path

This simplified MVP is a stepping stone:

1. **Current**: localStorage single-user
2. **This MVP**: PostgreSQL single-user (local)
3. **Next MVP**: Multi-user with authentication
4. **Production**: Full deployment with security

Each step maintains backward compatibility and builds on the previous foundation.
