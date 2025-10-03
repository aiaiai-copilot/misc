/**
 * PostgreSQL implementation of RecordRepository
 */

import { Pool } from 'pg';
import {
  RecordRepository,
  RecordSearchOptions,
  RecordSearchResult,
} from '@misc-poc/application';
import { Record, DomainError } from '@misc-poc/domain';
import { Result, Ok, Err, RecordId, TagId, SearchQuery } from '@misc-poc/shared';
import { RecordRow, fromDatabaseRow, toDatabaseRow } from './mappers';

export class PostgresRecordRepository implements RecordRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: RecordId): Promise<Result<Record | null, DomainError>> {
    try {
      const result = await this.pool.query<RecordRow>(
        'SELECT id, content, tags, normalized_tags, created_at, updated_at FROM records WHERE id = $1',
        [id.toString()]
      );

      if (result.rows.length === 0) {
        return Ok(null);
      }

      const row = result.rows[0];
      if (!row) {
        return Ok(null);
      }

      const record = fromDatabaseRow(row);
      return Ok(record);
    } catch (error) {
      return this.handleError('Failed to find record by ID', error);
    }
  }

  async findAll(
    options: RecordSearchOptions = {}
  ): Promise<Result<RecordSearchResult, DomainError>> {
    try {
      const { limit, offset, sortBy = 'createdAt', sortOrder = 'desc' } = options;

      const column = sortBy === 'createdAt' ? 'created_at' : 'updated_at';
      const order = sortOrder.toUpperCase();

      // Get total count
      const countResult = await this.pool.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM records'
      );
      const countRow = countResult.rows[0];
      if (!countRow) {
        return Ok({ records: [], total: 0, hasMore: false });
      }
      const total = parseInt(countRow.count, 10);

      // Build query with pagination
      let query = `SELECT id, content, tags, normalized_tags, created_at, updated_at FROM records ORDER BY ${column} ${order}`;
      const params: unknown[] = [];

      if (limit !== undefined) {
        params.push(limit);
        query += ` LIMIT $${params.length}`;
      }

      if (offset !== undefined) {
        params.push(offset);
        query += ` OFFSET $${params.length}`;
      }

      const result = await this.pool.query<RecordRow>(query, params);
      const records = result.rows.map(row => fromDatabaseRow(row));

      const hasMore = offset !== undefined && limit !== undefined
        ? offset + limit < total
        : false;

      return Ok({ records, total, hasMore });
    } catch (error) {
      return this.handleError('Failed to find all records', error);
    }
  }

  async search(
    query: SearchQuery,
    options: RecordSearchOptions = {}
  ): Promise<Result<RecordSearchResult, DomainError>> {
    try {
      const tokens = query.getTokens();

      if (tokens.length === 0) {
        return this.findAll(options);
      }

      const { limit, offset, sortBy = 'createdAt', sortOrder = 'desc' } = options;
      const column = sortBy === 'createdAt' ? 'created_at' : 'updated_at';
      const order = sortOrder.toUpperCase();

      // Search for records containing ALL tokens in their normalized_tags (AND logic)
      const normalizedTokens = tokens.map(t => t.toLowerCase());

      // Count total matching records
      const countQuery = `
        SELECT COUNT(*) as count
        FROM records
        WHERE normalized_tags @> $1
      `;
      const countResult = await this.pool.query<{ count: string }>(
        countQuery,
        [normalizedTokens]
      );
      const countRow = countResult.rows[0];
      if (!countRow) {
        return Ok({ records: [], total: 0, hasMore: false });
      }
      const total = parseInt(countRow.count, 10);

      // Build search query with pagination
      let searchQuery = `
        SELECT id, content, tags, normalized_tags, created_at, updated_at
        FROM records
        WHERE normalized_tags @> $1
        ORDER BY ${column} ${order}
      `;
      const params: unknown[] = [normalizedTokens];

      if (limit !== undefined) {
        params.push(limit);
        searchQuery += ` LIMIT $${params.length}`;
      }

      if (offset !== undefined) {
        params.push(offset);
        searchQuery += ` OFFSET $${params.length}`;
      }

      const result = await this.pool.query<RecordRow>(searchQuery, params);
      const records = result.rows.map(row => fromDatabaseRow(row));

      const hasMore = offset !== undefined && limit !== undefined
        ? offset + limit < total
        : false;

      return Ok({ records, total, hasMore });
    } catch (error) {
      return this.handleError('Failed to search records', error);
    }
  }

  async findByTagIds(
    tagIds: TagId[],
    options: RecordSearchOptions = {}
  ): Promise<Result<RecordSearchResult, DomainError>> {
    try {
      if (tagIds.length === 0) {
        return Ok({ records: [], total: 0, hasMore: false });
      }

      const { limit, offset, sortBy = 'createdAt', sortOrder = 'desc' } = options;
      const column = sortBy === 'createdAt' ? 'created_at' : 'updated_at';
      const order = sortOrder.toUpperCase();

      const tagIdStrings = tagIds.map(id => id.toString());

      // Count records that contain any of the tag IDs
      const countQuery = `
        SELECT COUNT(*) as count
        FROM records
        WHERE tags && $1
      `;
      const countResult = await this.pool.query<{ count: string }>(
        countQuery,
        [tagIdStrings]
      );
      const countRow = countResult.rows[0];
      if (!countRow) {
        return Ok({ records: [], total: 0, hasMore: false });
      }
      const total = parseInt(countRow.count, 10);

      // Find records with pagination
      let searchQuery = `
        SELECT id, content, tags, normalized_tags, created_at, updated_at
        FROM records
        WHERE tags && $1
        ORDER BY ${column} ${order}
      `;
      const params: unknown[] = [tagIdStrings];

      if (limit !== undefined) {
        params.push(limit);
        searchQuery += ` LIMIT $${params.length}`;
      }

      if (offset !== undefined) {
        params.push(offset);
        searchQuery += ` OFFSET $${params.length}`;
      }

      const result = await this.pool.query<RecordRow>(searchQuery, params);
      const records = result.rows.map(row => fromDatabaseRow(row));

      const hasMore = offset !== undefined && limit !== undefined
        ? offset + limit < total
        : false;

      return Ok({ records, total, hasMore });
    } catch (error) {
      return this.handleError('Failed to find records by tag IDs', error);
    }
  }

  async findByTagSet(
    tagIds: Set<TagId>,
    excludeRecordId?: RecordId
  ): Promise<Result<Record[], DomainError>> {
    try {
      const tagIdStrings = Array.from(tagIds).map(id => id.toString()).sort();

      let query = `
        SELECT id, content, tags, normalized_tags, created_at, updated_at
        FROM records
        WHERE tags = $1
      `;
      const params: unknown[] = [tagIdStrings];

      if (excludeRecordId) {
        params.push(excludeRecordId.toString());
        query += ` AND id != $${params.length}`;
      }

      const result = await this.pool.query<RecordRow>(query, params);
      const records = result.rows.map(row => fromDatabaseRow(row));

      return Ok(records);
    } catch (error) {
      return this.handleError('Failed to find records by tag set', error);
    }
  }

  async save(record: Record): Promise<Result<Record, DomainError>> {
    try {
      const row = toDatabaseRow(record);

      await this.pool.query(
        `INSERT INTO records (id, content, tags, normalized_tags, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [row.id, row.content, row.tags, row.normalized_tags, row.created_at, row.updated_at]
      );

      return Ok(record);
    } catch (error) {
      return this.handleError('Failed to save record', error);
    }
  }

  async update(record: Record): Promise<Result<Record, DomainError>> {
    try {
      const row = toDatabaseRow(record);

      const result = await this.pool.query(
        `UPDATE records
         SET content = $2, tags = $3, normalized_tags = $4, updated_at = $5
         WHERE id = $1`,
        [row.id, row.content, row.tags, row.normalized_tags, row.updated_at]
      );

      if (result.rowCount === 0) {
        return Err(new DomainError('RECORD_NOT_FOUND', 'Record not found'));
      }

      return Ok(record);
    } catch (error) {
      return this.handleError('Failed to update record', error);
    }
  }

  async delete(id: RecordId): Promise<Result<void, DomainError>> {
    try {
      const result = await this.pool.query(
        'DELETE FROM records WHERE id = $1',
        [id.toString()]
      );

      if (result.rowCount === 0) {
        return Err(new DomainError('RECORD_NOT_FOUND', 'Record not found'));
      }

      return Ok(undefined);
    } catch (error) {
      return this.handleError('Failed to delete record', error);
    }
  }

  async saveBatch(records: Record[]): Promise<Result<Record[], DomainError>> {
    if (records.length === 0) {
      return Ok([]);
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (const record of records) {
        const row = toDatabaseRow(record);
        await client.query(
          `INSERT INTO records (id, content, tags, normalized_tags, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [row.id, row.content, row.tags, row.normalized_tags, row.created_at, row.updated_at]
        );
      }

      await client.query('COMMIT');
      return Ok(records);
    } catch (error) {
      await client.query('ROLLBACK');
      return this.handleError('Failed to save record batch', error);
    } finally {
      client.release();
    }
  }

  async deleteAll(): Promise<Result<void, DomainError>> {
    try {
      await this.pool.query('DELETE FROM records');
      return Ok(undefined);
    } catch (error) {
      return this.handleError('Failed to delete all records', error);
    }
  }

  async count(): Promise<Result<number, DomainError>> {
    try {
      const result = await this.pool.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM records'
      );
      const countRow = result.rows[0];
      if (!countRow) {
        return Ok(0);
      }
      const count = parseInt(countRow.count, 10);
      return Ok(count);
    } catch (error) {
      return this.handleError('Failed to count records', error);
    }
  }

  async exists(id: RecordId): Promise<Result<boolean, DomainError>> {
    try {
      const result = await this.pool.query<{ exists: boolean }>(
        'SELECT EXISTS(SELECT 1 FROM records WHERE id = $1) as exists',
        [id.toString()]
      );
      const existsRow = result.rows[0];
      if (!existsRow) {
        return Ok(false);
      }
      return Ok(existsRow.exists);
    } catch (error) {
      return this.handleError('Failed to check record existence', error);
    }
  }

  async getTagStatistics(): Promise<Result<Array<{ tag: string; count: number }>, DomainError>> {
    try {
      // Use UNNEST to expand the normalized_tags array and count occurrences
      const result = await this.pool.query<{ tag: string; count: string }>(
        `SELECT tag, COUNT(*) as count
         FROM records, UNNEST(normalized_tags) AS tag
         GROUP BY tag
         ORDER BY count DESC, tag ASC`
      );

      const statistics = result.rows.map(row => ({
        tag: row.tag,
        count: parseInt(row.count, 10),
      }));

      return Ok(statistics);
    } catch (error) {
      return this.handleError('Failed to get tag statistics', error);
    }
  }

  private handleError(
    message: string,
    error: unknown
  ): Result<never, DomainError> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${message}:`, error);

    // Handle specific PostgreSQL errors
    if (error && typeof error === 'object' && 'code' in error) {
      const pgError = error as { code: string; constraint?: string };

      // Unique constraint violation
      if (pgError.code === '23505') {
        return Err(new DomainError('DUPLICATE_RECORD', 'Record already exists'));
      }

      // Foreign key violation
      if (pgError.code === '23503') {
        return Err(new DomainError('CONSTRAINT_VIOLATION', 'Foreign key constraint violation'));
      }

      // Connection errors
      if (pgError.code === 'ECONNREFUSED' || pgError.code === 'ENOTFOUND') {
        return Err(new DomainError('CONNECTION_ERROR', 'Database connection failed'));
      }
    }

    return Err(new DomainError('DATABASE_ERROR', `${message}: ${errorMessage}`));
  }
}
