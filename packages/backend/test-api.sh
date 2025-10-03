#!/bin/bash

# API Testing Script for Records CRUD Endpoints
# Usage: ./test-api.sh

set -e

BASE_URL="http://localhost:3001"
RECORD_ID=""

echo "🧪 Testing Records CRUD API Endpoints"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo "1️⃣  Testing health endpoint..."
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Health check passed${NC}"
    echo "   Response: $body"
else
    echo -e "${RED}✗ Health check failed (HTTP $http_code)${NC}"
    exit 1
fi
echo ""

# Test 2: GET /api/records (empty)
echo "2️⃣  Testing GET /api/records (empty list)..."
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/records")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ GET /api/records passed${NC}"
    echo "   Response: $body"
else
    echo -e "${RED}✗ GET /api/records failed (HTTP $http_code)${NC}"
    echo "   Response: $body"
fi
echo ""

# Test 3: POST /api/records (create)
echo "3️⃣  Testing POST /api/records (create record)..."
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/records" \
    -H "Content-Type: application/json" \
    -d '{"content": "Test record created by automated script"}')
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "201" ]; then
    echo -e "${GREEN}✓ POST /api/records passed${NC}"
    echo "   Response: $body"
    RECORD_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "   📝 Saved record ID: $RECORD_ID"
else
    echo -e "${RED}✗ POST /api/records failed (HTTP $http_code)${NC}"
    echo "   Response: $body"
fi
echo ""

# Test 4: GET /api/records (with data)
echo "4️⃣  Testing GET /api/records (with data)..."
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/records")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    total=$(echo "$body" | grep -o '"total":[0-9]*' | cut -d':' -f2)
    if [ "$total" -gt 0 ]; then
        echo -e "${GREEN}✓ GET /api/records passed (found $total records)${NC}"
        echo "   Response: $body"
    else
        echo -e "${YELLOW}⚠ GET /api/records returned empty list${NC}"
    fi
else
    echo -e "${RED}✗ GET /api/records failed (HTTP $http_code)${NC}"
fi
echo ""

# Test 5: GET /api/records with pagination
echo "5️⃣  Testing GET /api/records?limit=10&offset=0..."
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/records?limit=10&offset=0")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Pagination test passed${NC}"
else
    echo -e "${RED}✗ Pagination test failed (HTTP $http_code)${NC}"
fi
echo ""

# Test 6: PUT /api/records/:id (update)
if [ -n "$RECORD_ID" ]; then
    echo "6️⃣  Testing PUT /api/records/$RECORD_ID (update record)..."
    response=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/records/$RECORD_ID" \
        -H "Content-Type: application/json" \
        -d '{"content": "Updated content from automated script"}')
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ PUT /api/records/:id passed${NC}"
        echo "   Response: $body"
    else
        echo -e "${RED}✗ PUT /api/records/:id failed (HTTP $http_code)${NC}"
        echo "   Response: $body"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ Skipping PUT test (no record ID)${NC}"
    echo ""
fi

# Test 7: DELETE /api/records/:id
if [ -n "$RECORD_ID" ]; then
    echo "7️⃣  Testing DELETE /api/records/$RECORD_ID..."
    response=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/records/$RECORD_ID")
    http_code=$(echo "$response" | tail -n1)

    if [ "$http_code" = "204" ]; then
        echo -e "${GREEN}✓ DELETE /api/records/:id passed${NC}"
    else
        echo -e "${RED}✗ DELETE /api/records/:id failed (HTTP $http_code)${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ Skipping DELETE test (no record ID)${NC}"
    echo ""
fi

# Test 8: Error case - Invalid UUID
echo "8️⃣  Testing error handling (invalid UUID)..."
response=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/records/invalid-uuid" \
    -H "Content-Type: application/json" \
    -d '{"content": "test"}')
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "400" ]; then
    echo -e "${GREEN}✓ Invalid UUID error handling passed${NC}"
else
    echo -e "${RED}✗ Invalid UUID should return 400, got $http_code${NC}"
fi
echo ""

# Test 9: Error case - Missing content
echo "9️⃣  Testing error handling (missing content)..."
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/records" \
    -H "Content-Type: application/json" \
    -d '{}')
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "400" ]; then
    echo -e "${GREEN}✓ Missing content error handling passed${NC}"
else
    echo -e "${RED}✗ Missing content should return 400, got $http_code${NC}"
fi
echo ""

echo "======================================"
echo -e "${GREEN}✅ All tests completed!${NC}"
