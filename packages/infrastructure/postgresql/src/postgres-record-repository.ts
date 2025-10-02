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
import { Result, RecordId, TagId, SearchQuery } from '@misc-poc/shared';

export class PostgresRecordRepository implements RecordRepository {
  // @ts-expect-error - Pool will be used in future implementations
  constructor(private readonly _pool: Pool) {}

  async findById(_id: RecordId): Promise<Result<Record | null, DomainError>> {
    throw new Error('Not implemented yet');
  }

  async findAll(
    _options?: RecordSearchOptions
  ): Promise<Result<RecordSearchResult, DomainError>> {
    throw new Error('Not implemented yet');
  }

  async search(
    _query: SearchQuery,
    _options?: RecordSearchOptions
  ): Promise<Result<RecordSearchResult, DomainError>> {
    throw new Error('Not implemented yet');
  }

  async findByTagIds(
    _tagIds: TagId[],
    _options?: RecordSearchOptions
  ): Promise<Result<RecordSearchResult, DomainError>> {
    throw new Error('Not implemented yet');
  }

  async findByTagSet(
    _tagIds: Set<TagId>,
    _excludeRecordId?: RecordId
  ): Promise<Result<Record[], DomainError>> {
    throw new Error('Not implemented yet');
  }

  async save(_record: Record): Promise<Result<Record, DomainError>> {
    throw new Error('Not implemented yet');
  }

  async update(_record: Record): Promise<Result<Record, DomainError>> {
    throw new Error('Not implemented yet');
  }

  async delete(_id: RecordId): Promise<Result<void, DomainError>> {
    throw new Error('Not implemented yet');
  }

  async saveBatch(_records: Record[]): Promise<Result<Record[], DomainError>> {
    throw new Error('Not implemented yet');
  }

  async deleteAll(): Promise<Result<void, DomainError>> {
    throw new Error('Not implemented yet');
  }

  async count(): Promise<Result<number, DomainError>> {
    throw new Error('Not implemented yet');
  }

  async exists(_id: RecordId): Promise<Result<boolean, DomainError>> {
    throw new Error('Not implemented yet');
  }
}
