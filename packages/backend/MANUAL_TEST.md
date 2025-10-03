# Manual Testing Guide for Task 4.2 - Records CRUD Endpoints

## Prerequisites

1. PostgreSQL must be running: `docker ps | grep postgres`
2. Database must be initialized with schema
3. Backend server must be running: `yarn workspace @misc-poc/backend dev`

## Test Scenarios

### 1. Start the Backend Server

```bash
# From project root
yarn workspace @misc-poc/backend dev
```

Server should start on port 3001 (or PORT from .env)

### 2. Test GET /api/records (Empty List)

```bash
curl -X GET http://localhost:3001/api/records
```

Expected response:
```json
{
  "records": [],
  "total": 0
}
```

### 3. Test POST /api/records (Create Record)

```bash
curl -X POST http://localhost:3001/api/records \
  -H "Content-Type: application/json" \
  -d '{"content": "Test record with some content"}'
```

Expected response (201 Created):
```json
{
  "id": "some-uuid",
  "content": "Test record with some content",
  "tagIds": [],
  "createdAt": "2025-10-03T...",
  "updatedAt": "2025-10-03T..."
}
```

Save the returned `id` for next tests!

### 4. Test GET /api/records (List with Data)

```bash
curl -X GET http://localhost:3001/api/records
```

Expected response:
```json
{
  "records": [
    {
      "id": "...",
      "content": "Test record with some content",
      "tagIds": [],
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "total": 1
}
```

### 5. Test GET /api/records with Pagination

```bash
curl -X GET "http://localhost:3001/api/records?limit=10&offset=0"
```

### 6. Test GET /api/records with Search

```bash
curl -X GET "http://localhost:3001/api/records?q=Test"
```

### 7. Test PUT /api/records/:id (Update Record)

```bash
# Replace <record-id> with actual ID from step 3
curl -X PUT http://localhost:3001/api/records/<record-id> \
  -H "Content-Type: application/json" \
  -d '{"content": "Updated content for testing"}'
```

Expected response (200 OK):
```json
{
  "id": "<same-record-id>",
  "content": "Updated content for testing",
  "tagIds": [],
  "createdAt": "...",
  "updatedAt": "..." // should be newer than createdAt
}
```

### 8. Test DELETE /api/records/:id

```bash
# Replace <record-id> with actual ID
curl -X DELETE http://localhost:3001/api/records/<record-id>
```

Expected response: 204 No Content (empty response)

### 9. Verify Deletion

```bash
curl -X GET http://localhost:3001/api/records
```

Expected response:
```json
{
  "records": [],
  "total": 0
}
```

## Error Cases to Test

### Invalid UUID Format (400 Bad Request)

```bash
curl -X GET http://localhost:3001/api/records/invalid-uuid
```

Expected: 400 error

### Non-existent Record (404 Not Found)

```bash
curl -X PUT http://localhost:3001/api/records/00000000-0000-0000-0000-000000000000 \
  -H "Content-Type: application/json" \
  -d '{"content": "test"}'
```

Expected: 404 error

### Missing Content (400 Bad Request)

```bash
curl -X POST http://localhost:3001/api/records \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: 400 error

### Invalid Limit/Offset (400 Bad Request)

```bash
curl -X GET "http://localhost:3001/api/records?limit=invalid"
```

Expected: 400 error

## Quick Test Script

See `test-api.sh` for automated testing of all endpoints.
