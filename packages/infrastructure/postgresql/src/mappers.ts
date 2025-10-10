/**
 * Database mapping utilities for Record <-> PostgreSQL row conversion
 */

import { Record } from '@misc-poc/domain';
import { RecordId, RecordContent, TagId } from '@misc-poc/shared';

/**
 * Database row structure matching PostgreSQL schema
 */
export interface RecordRow {
  id: string; // UUID as string
  content: string;
  tags: string[]; // Array of tag UUIDs
  normalized_tags: string[]; // Normalized tag values for search
  created_at: Date;
  updated_at: Date;
}

/**
 * Convert domain Record to database row
 */
export function toDatabaseRow(record: Record): RecordRow {
  const tagIds: TagId[] = Array.from(record.tagIds);

  // Normalize tag UUIDs to lowercase for case-insensitive search
  const normalizedTags = tagIds.map((tagId: TagId) => tagId.toString().toLowerCase());

  return {
    id: record.id.toString(),
    content: record.content.toString(),
    tags: tagIds.map((tagId: TagId) => tagId.toString()),
    normalized_tags: normalizedTags,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

/**
 * Convert database row to domain Record
 */
export function fromDatabaseRow(row: RecordRow): Record {
  const recordId = new RecordId(row.id);
  const content = new RecordContent(row.content);
  const tagIds = new Set(row.tags.map(tag => new TagId(tag)));

  return new Record(
    recordId,
    content,
    tagIds,
    row.created_at,
    row.updated_at
  );
}
