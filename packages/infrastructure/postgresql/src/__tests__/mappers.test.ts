/**
 * Unit tests for database mapping utilities
 */

import { Record } from '@misc-poc/domain';
import { RecordId, RecordContent, TagId } from '@misc-poc/shared';
import { toDatabaseRow, fromDatabaseRow, RecordRow } from '../mappers';

describe('Database Mappers', () => {
  describe('toDatabaseRow', () => {
    it('should convert Record to database row with all fields', () => {
      const recordId = new RecordId('550e8400-e29b-41d4-a716-446655440000');
      const content = new RecordContent('Test content');
      const tagId1 = new TagId('650e8400-e29b-41d4-a716-446655440001');
      const tagId2 = new TagId('750e8400-e29b-41d4-a716-446655440002');
      const tagIds = new Set([tagId1, tagId2]);
      const createdAt = new Date('2024-01-01T00:00:00Z');
      const updatedAt = new Date('2024-01-02T00:00:00Z');

      const record = new Record(recordId, content, tagIds, createdAt, updatedAt);

      const row = toDatabaseRow(record);

      expect(row.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(row.content).toBe('Test content');
      expect(row.tags).toHaveLength(2);
      expect(row.tags).toContain('650e8400-e29b-41d4-a716-446655440001');
      expect(row.tags).toContain('750e8400-e29b-41d4-a716-446655440002');
      expect(row.normalized_tags).toHaveLength(2);
      expect(row.normalized_tags).toContain('650e8400-e29b-41d4-a716-446655440001');
      expect(row.normalized_tags).toContain('750e8400-e29b-41d4-a716-446655440002');
      expect(row.created_at).toEqual(createdAt);
      expect(row.updated_at).toEqual(updatedAt);
    });

    it('should handle empty tag set', () => {
      const recordId = new RecordId('550e8400-e29b-41d4-a716-446655440000');
      const content = new RecordContent('No tags');
      const tagIds = new Set<TagId>();
      const createdAt = new Date();
      const updatedAt = new Date();

      const record = new Record(recordId, content, tagIds, createdAt, updatedAt);

      const row = toDatabaseRow(record);

      expect(row.tags).toHaveLength(0);
      expect(row.normalized_tags).toHaveLength(0);
    });

    it('should normalize tag IDs to lowercase', () => {
      const recordId = RecordId.generate();
      const content = new RecordContent('Test');
      const tagId = new TagId('AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA');
      const tagIds = new Set([tagId]);
      const createdAt = new Date();
      const updatedAt = new Date();

      const record = new Record(recordId, content, tagIds, createdAt, updatedAt);

      const row = toDatabaseRow(record);

      expect(row.normalized_tags[0]).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    });
  });

  describe('fromDatabaseRow', () => {
    it('should convert database row to Record with all fields', () => {
      const row: RecordRow = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        content: 'Test content',
        tags: [
          '650e8400-e29b-41d4-a716-446655440001',
          '750e8400-e29b-41d4-a716-446655440002',
        ],
        normalized_tags: [
          '650e8400-e29b-41d4-a716-446655440001',
          '750e8400-e29b-41d4-a716-446655440002',
        ],
        created_at: new Date('2024-01-01T00:00:00Z'),
        updated_at: new Date('2024-01-02T00:00:00Z'),
      };

      const record = fromDatabaseRow(row);

      expect(record.id.toString()).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(record.content.toString()).toBe('Test content');
      expect(record.tagIds.size).toBe(2);
      expect(record.createdAt).toEqual(row.created_at);
      expect(record.updatedAt).toEqual(row.updated_at);

      const tagIdsArray = Array.from(record.tagIds);
      const tagIdStrings = tagIdsArray.map(t => t.toString());
      expect(tagIdStrings).toContain('650e8400-e29b-41d4-a716-446655440001');
      expect(tagIdStrings).toContain('750e8400-e29b-41d4-a716-446655440002');
    });

    it('should handle empty tags array', () => {
      const row: RecordRow = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        content: 'No tags',
        tags: [],
        normalized_tags: [],
        created_at: new Date(),
        updated_at: new Date(),
      };

      const record = fromDatabaseRow(row);

      expect(record.tagIds.size).toBe(0);
    });

    it('should throw error for invalid UUID in id', () => {
      const row: RecordRow = {
        id: 'invalid-uuid',
        content: 'Test',
        tags: [],
        normalized_tags: [],
        created_at: new Date(),
        updated_at: new Date(),
      };

      expect(() => fromDatabaseRow(row)).toThrow('Invalid RecordId');
    });

    it('should throw error for invalid UUID in tags', () => {
      const row: RecordRow = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        content: 'Test',
        tags: ['invalid-uuid'],
        normalized_tags: ['invalid-uuid'],
        created_at: new Date(),
        updated_at: new Date(),
      };

      expect(() => fromDatabaseRow(row)).toThrow('Invalid TagId');
    });

    it('should throw error for empty content', () => {
      const row: RecordRow = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        content: '   ',
        tags: [],
        normalized_tags: [],
        created_at: new Date(),
        updated_at: new Date(),
      };

      expect(() => fromDatabaseRow(row)).toThrow('RecordContent cannot be empty');
    });
  });

  describe('round-trip conversion', () => {
    it('should maintain data integrity through toDatabaseRow and fromDatabaseRow', () => {
      const originalRecordId = new RecordId('550e8400-e29b-41d4-a716-446655440000');
      const originalContent = new RecordContent('Original content');
      const originalTagId1 = new TagId('650e8400-e29b-41d4-a716-446655440001');
      const originalTagId2 = new TagId('750e8400-e29b-41d4-a716-446655440002');
      const originalTagIds = new Set([originalTagId1, originalTagId2]);
      const originalCreatedAt = new Date('2024-01-01T00:00:00Z');
      const originalUpdatedAt = new Date('2024-01-02T00:00:00Z');

      const originalRecord = new Record(
        originalRecordId,
        originalContent,
        originalTagIds,
        originalCreatedAt,
        originalUpdatedAt
      );

      // Convert to row and back
      const row = toDatabaseRow(originalRecord);
      const reconstructedRecord = fromDatabaseRow(row);

      // Verify all fields match
      expect(reconstructedRecord.id.toString()).toBe(originalRecord.id.toString());
      expect(reconstructedRecord.content.toString()).toBe(originalRecord.content.toString());
      expect(reconstructedRecord.tagIds.size).toBe(originalRecord.tagIds.size);
      expect(reconstructedRecord.createdAt).toEqual(originalRecord.createdAt);
      expect(reconstructedRecord.updatedAt).toEqual(originalRecord.updatedAt);

      // Verify tag IDs match
      const originalTagIdsArray = Array.from(originalRecord.tagIds).map(t => t.toString()).sort();
      const reconstructedTagIdsArray = Array.from(reconstructedRecord.tagIds).map(t => t.toString()).sort();
      expect(reconstructedTagIdsArray).toEqual(originalTagIdsArray);
    });
  });
});
