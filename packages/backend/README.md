# Backend Package

Express.js backend server for the misc-poc project.

## Getting Started

### Start the server

```bash
yarn workspace @misc-poc/backend dev
```

The server will start on port 3001.

### Manual Testing

#### Test the health endpoint

In another terminal:

```bash
curl http://localhost:3001/health
```

Expected response:

```json
{"status":"ok","timestamp":"2025-10-02T..."}
```

#### Test CORS headers

Verify localhost:3000 is allowed:

```bash
curl -H "Origin: http://localhost:3000" -v http://localhost:3001/health
```

Should see header: `Access-Control-Allow-Origin: http://localhost:3000`

#### Test 404 handling

```bash
curl http://localhost:3001/nonexistent
```

Expected response:

```json
{"error":"Not Found"}
```

Status code: 404

#### Stop the server

Press `Ctrl+C` when done.

## Scripts

- `yarn dev` - Start development server with hot reload
- `yarn build` - Build TypeScript to JavaScript
- `yarn start` - Start production server
- `yarn test` - Run tests
- `yarn typecheck` - Run TypeScript type checking
- `yarn lint` - Run ESLint

## Configuration

Copy `.env.example` to `.env` and adjust as needed:

```env
PORT=3001
NODE_ENV=development
```
