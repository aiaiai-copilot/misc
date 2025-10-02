-- Database initialization script for MISC PostgreSQL migration
-- This script creates the records table with the exact schema from PRD

CREATE TABLE records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  tags TEXT[] NOT NULL,
  normalized_tags TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(normalized_tags)
);

-- GIN index for efficient tag search queries
CREATE INDEX idx_records_normalized_tags ON records USING GIN(normalized_tags);

-- B-tree index for sorting by creation date
CREATE INDEX idx_records_created_at ON records(created_at DESC);
