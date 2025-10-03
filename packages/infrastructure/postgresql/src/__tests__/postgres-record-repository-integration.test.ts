/**
 * Integration tests for PostgresRecordRepository using Testcontainers
 *
 * These tests run against a real PostgreSQL database to verify:
 * - All CRUD operations work correctly
 * - Tag search functionality with array operators
 * - Bulk operations and transactions
 * - Error handling and edge cases
 * - Data integrity and isolation
 */

import { Pool } from 'pg';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PostgresRecordRepository } from '../postgres-record-repository';
import { Record } from '@misc-poc/domain';
import { RecordId, RecordContent, TagId, SearchQuery } from '@misc-poc/shared';

describe('PostgresRecordRepository Integration Tests [perf]', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let repository: PostgresRecordRepository;

  // Setup: Start PostgreSQL container and initialize schema
  beforeAll(async () => {
    jest.setTimeout(300000); // 5 minutes for container startup
    // Start PostgreSQL container
    container = await new PostgreSqlContainer()
      .start();

    // Create connection pool
    pool = new Pool({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
    });

    // Initialize database schema
    await pool.query(`
      CREATE TABLE IF NOT EXISTS records (
        id UUID PRIMARY KEY,
        content TEXT NOT NULL,
        tags UUID[] NOT NULL DEFAULT '{}',
        normalized_tags TEXT[] NOT NULL DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL
      );

      -- Create GIN index for tag search performance
      CREATE INDEX IF NOT EXISTS idx_records_tags ON records USING GIN (tags);
      CREATE INDEX IF NOT EXISTS idx_records_normalized_tags ON records USING GIN (normalized_tags);
    `);

    repository = new PostgresRecordRepository(pool);
  }, 60000); // 60 second timeout for container startup

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
    if (container) {
      await container.stop();
    }
  });

  // Clean up data between tests
  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE records');
  });

  describe('findById', () => {
    it('should return null for non-existent record', async () => {
      const id = RecordId.generate();
      const result = await repository.findById(id);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBeNull();
    });

    it('should find existing record by ID', async () => {
      const record = Record.create(
        new RecordContent('Test content'),
        new Set([new TagId('550e8400-e29b-41d4-a716-446655440001')])
      );

      await repository.save(record);
      const result = await repository.findById(record.id);

      expect(result.isOk()).toBe(true);
      const found = result.unwrap();
      expect(found).not.toBeNull();
      expect(found!.id.equals(record.id)).toBe(true);
      expect(found!.content.toString()).toBe('Test content');
    });
  });

  describe('findAll', () => {
    it('should return empty result when no records exist', async () => {
      const result = await repository.findAll();

      expect(result.isOk()).toBe(true);
      const searchResult = result.unwrap();
      expect(searchResult.records).toHaveLength(0);
      expect(searchResult.total).toBe(0);
      expect(searchResult.hasMore).toBe(false);
    });

    it('should return all records', async () => {
      const record1 = Record.create(new RecordContent('Content 1'), new Set());
      const record2 = Record.create(new RecordContent('Content 2'), new Set());

      await repository.save(record1);
      await repository.save(record2);

      const result = await repository.findAll();

      expect(result.isOk()).toBe(true);
      const searchResult = result.unwrap();
      expect(searchResult.records).toHaveLength(2);
      expect(searchResult.total).toBe(2);
    });

    it('should support pagination with limit and offset', async () => {
      // Create 5 records
      for (let i = 0; i < 5; i++) {
        await repository.save(
          Record.create(new RecordContent(`Content ${i}`), new Set())
        );
      }

      const result = await repository.findAll({ limit: 2, offset: 1 });

      expect(result.isOk()).toBe(true);
      const searchResult = result.unwrap();
      expect(searchResult.records).toHaveLength(2);
      expect(searchResult.total).toBe(5);
      expect(searchResult.hasMore).toBe(true);
    });

    it('should support sorting by createdAt descending', async () => {
      const record1 = Record.create(new RecordContent('First'), new Set());
      await repository.save(record1);

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const record2 = Record.create(new RecordContent('Second'), new Set());
      await repository.save(record2);

      const result = await repository.findAll({ sortBy: 'createdAt', sortOrder: 'desc' });

      expect(result.isOk()).toBe(true);
      const records = result.unwrap().records;
      expect(records[0].content.toString()).toBe('Second'); // Most recent first
    });
  });

  describe('search', () => {
    it('should return empty result when no tokens provided', async () => {
      await repository.save(Record.create(new RecordContent('Test'), new Set()));

      const result = await repository.search(new SearchQuery(''));

      expect(result.isOk()).toBe(true);
      const searchResult = result.unwrap();
      expect(searchResult.records).toHaveLength(1); // Returns all like findAll
    });

    it('should search records by normalized tag tokens', async () => {
      const tagId1 = new TagId('550e8400-e29b-41d4-a716-446655440001');
      const tagId2 = new TagId('650e8400-e29b-41d4-a716-446655440002');

      const record1 = Record.create(
        new RecordContent('Record 1'),
        new Set([tagId1])
      );
      const record2 = Record.create(
        new RecordContent('Record 2'),
        new Set([tagId2])
      );

      await repository.save(record1);
      await repository.save(record2);

      const result = await repository.search(
        new SearchQuery(tagId1.toString().toLowerCase())
      );

      expect(result.isOk()).toBe(true);
      const searchResult = result.unwrap();
      expect(searchResult.records).toHaveLength(1);
      expect(searchResult.records[0].content.toString()).toBe('Record 1');
    });

    it('should use AND logic for multiple tokens', async () => {
      const tagId1 = new TagId('550e8400-e29b-41d4-a716-446655440001');
      const tagId2 = new TagId('650e8400-e29b-41d4-a716-446655440002');

      const record1 = Record.create(
        new RecordContent('Has both'),
        new Set([tagId1, tagId2])
      );
      const record2 = Record.create(
        new RecordContent('Has one'),
        new Set([tagId1])
      );

      await repository.save(record1);
      await repository.save(record2);

      const query = `${tagId1.toString().toLowerCase()} ${tagId2.toString().toLowerCase()}`;
      const result = await repository.search(new SearchQuery(query));

      expect(result.isOk()).toBe(true);
      const searchResult = result.unwrap();
      expect(searchResult.records).toHaveLength(1);
      expect(searchResult.records[0].content.toString()).toBe('Has both');
    });
  });

  describe('findByTagIds', () => {
    it('should return empty result for empty tag array', async () => {
      const result = await repository.findByTagIds([]);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap().records).toHaveLength(0);
    });

    it('should find records containing any of the specified tags (OR logic)', async () => {
      const tagId1 = new TagId('550e8400-e29b-41d4-a716-446655440001');
      const tagId2 = new TagId('650e8400-e29b-41d4-a716-446655440002');
      const tagId3 = new TagId('750e8400-e29b-41d4-a716-446655440003');

      const record1 = Record.create(new RecordContent('Has tag1'), new Set([tagId1]));
      const record2 = Record.create(new RecordContent('Has tag2'), new Set([tagId2]));
      const record3 = Record.create(new RecordContent('Has tag3'), new Set([tagId3]));

      await repository.save(record1);
      await repository.save(record2);
      await repository.save(record3);

      const result = await repository.findByTagIds([tagId1, tagId2]);

      expect(result.isOk()).toBe(true);
      const searchResult = result.unwrap();
      expect(searchResult.records).toHaveLength(2);
      expect(searchResult.total).toBe(2);
    });
  });

  describe('findByTagSet', () => {
    it('should find records with exact tag set match', async () => {
      const tagId1 = new TagId('550e8400-e29b-41d4-a716-446655440001');
      const tagId2 = new TagId('650e8400-e29b-41d4-a716-446655440002');

      const record1 = Record.create(
        new RecordContent('Exact match'),
        new Set([tagId1, tagId2])
      );
      const record2 = Record.create(
        new RecordContent('Subset'),
        new Set([tagId1])
      );
      const record3 = Record.create(
        new RecordContent('Another exact match'),
        new Set([tagId1, tagId2])
      );

      await repository.save(record1);
      await repository.save(record2);
      await repository.save(record3);

      const result = await repository.findByTagSet(new Set([tagId1, tagId2]));

      expect(result.isOk()).toBe(true);
      const records = result.unwrap();
      expect(records).toHaveLength(2);
    });

    it('should exclude specified record ID', async () => {
      const tagId1 = new TagId('550e8400-e29b-41d4-a716-446655440001');

      const record1 = Record.create(new RecordContent('Record 1'), new Set([tagId1]));
      const record2 = Record.create(new RecordContent('Record 2'), new Set([tagId1]));

      await repository.save(record1);
      await repository.save(record2);

      const result = await repository.findByTagSet(new Set([tagId1]), record1.id);

      expect(result.isOk()).toBe(true);
      const records = result.unwrap();
      expect(records).toHaveLength(1);
      expect(records[0].id.equals(record2.id)).toBe(true);
    });
  });

  describe('save', () => {
    it('should save new record successfully', async () => {
      const record = Record.create(
        new RecordContent('New record'),
        new Set([new TagId('550e8400-e29b-41d4-a716-446655440001')])
      );

      const result = await repository.save(record);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap().id.equals(record.id)).toBe(true);

      // Verify it was saved
      const found = await repository.findById(record.id);
      expect(found.isOk()).toBe(true);
      expect(found.unwrap()).not.toBeNull();
    });

    it('should return error for duplicate ID', async () => {
      const record = Record.create(new RecordContent('Test'), new Set());

      await repository.save(record);
      const result = await repository.save(record);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().code).toBe('DUPLICATE_RECORD');
    });
  });

  describe('update', () => {
    it('should update existing record', async () => {
      const record = Record.create(new RecordContent('Original'), new Set());
      await repository.save(record);

      const tagId = new TagId('550e8400-e29b-41d4-a716-446655440001');
      const updatedRecord = record.updateTags(new Set([tagId]));

      const result = await repository.update(updatedRecord);

      expect(result.isOk()).toBe(true);

      // Verify update
      const found = await repository.findById(record.id);
      expect(found.isOk()).toBe(true);
      expect(found.unwrap()!.tagIds.size).toBe(1);
    });

    it('should return error for non-existent record', async () => {
      const record = Record.create(new RecordContent('Does not exist'), new Set());

      const result = await repository.update(record);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().code).toBe('RECORD_NOT_FOUND');
    });
  });

  describe('delete', () => {
    it('should delete existing record', async () => {
      const record = Record.create(new RecordContent('To delete'), new Set());
      await repository.save(record);

      const result = await repository.delete(record.id);

      expect(result.isOk()).toBe(true);

      // Verify deletion
      const found = await repository.findById(record.id);
      expect(found.unwrap()).toBeNull();
    });

    it('should return error for non-existent record', async () => {
      const id = RecordId.generate();

      const result = await repository.delete(id);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().code).toBe('RECORD_NOT_FOUND');
    });
  });

  describe('saveBatch', () => {
    it('should save multiple records in transaction', async () => {
      const records = [
        Record.create(new RecordContent('Batch 1'), new Set()),
        Record.create(new RecordContent('Batch 2'), new Set()),
        Record.create(new RecordContent('Batch 3'), new Set()),
      ];

      const result = await repository.saveBatch(records);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toHaveLength(3);

      // Verify all were saved
      const allRecords = await repository.findAll();
      expect(allRecords.unwrap().total).toBe(3);
    });

    it('should rollback on error', async () => {
      const record1 = Record.create(new RecordContent('First'), new Set());
      await repository.save(record1);

      const records = [
        Record.create(new RecordContent('New 1'), new Set()),
        record1, // Duplicate - should cause rollback
        Record.create(new RecordContent('New 2'), new Set()),
      ];

      const result = await repository.saveBatch(records);

      expect(result.isErr()).toBe(true);

      // Verify none of the batch was saved
      const allRecords = await repository.findAll();
      expect(allRecords.unwrap().total).toBe(1); // Only the original record
    });

    it('should handle empty batch', async () => {
      const result = await repository.saveBatch([]);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toHaveLength(0);
    });
  });

  describe('deleteAll', () => {
    it('should delete all records', async () => {
      await repository.save(Record.create(new RecordContent('1'), new Set()));
      await repository.save(Record.create(new RecordContent('2'), new Set()));
      await repository.save(Record.create(new RecordContent('3'), new Set()));

      const result = await repository.deleteAll();

      expect(result.isOk()).toBe(true);

      const count = await repository.count();
      expect(count.unwrap()).toBe(0);
    });
  });

  describe('count', () => {
    it('should return 0 for empty table', async () => {
      const result = await repository.count();

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(0);
    });

    it('should return correct count', async () => {
      await repository.save(Record.create(new RecordContent('1'), new Set()));
      await repository.save(Record.create(new RecordContent('2'), new Set()));

      const result = await repository.count();

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(2);
    });
  });

  describe('exists', () => {
    it('should return false for non-existent record', async () => {
      const id = RecordId.generate();

      const result = await repository.exists(id);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(false);
    });

    it('should return true for existing record', async () => {
      const record = Record.create(new RecordContent('Exists'), new Set());
      await repository.save(record);

      const result = await repository.exists(record.id);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(true);
    });
  });
});
