/**
 * API-based implementation of RecordRepository
 * Maps between API DTOs and domain entities
 */

import {
  RecordRepository,
  RecordSearchOptions,
  RecordSearchResult,
} from '@misc-poc/application';
import { Record, DomainError } from '@misc-poc/domain';
import { Result, Ok, Err, RecordId, TagId, RecordContent, SearchQuery } from '@misc-poc/shared';

export interface RecordDTO {
  id: string;
  content: string;
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult<T> {
  records: T[];
  total: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiClient {
  searchRecords(
    query?: string,
    options?: { limit?: number; offset?: number }
  ): Promise<Result<SearchResult<RecordDTO>, ApiError>>;
  createRecord(request: { content: string }): Promise<Result<RecordDTO, ApiError>>;
  updateRecord(id: string, request: { content: string }): Promise<Result<RecordDTO, ApiError>>;
  deleteRecord(id: string): Promise<Result<void, ApiError>>;
  getTagStatistics(): Promise<Result<Array<{ tag: string; count: number }>, ApiError>>;
}

export class ApiRecordRepository implements RecordRepository {
  constructor(private readonly apiClient: ApiClient) {}

  async findById(id: RecordId): Promise<Result<Record | null, DomainError>> {
    // API doesn't have a findById endpoint, so we search for it
    const result = await this.apiClient.searchRecords(id.toString(), { limit: 1 });

    if (result.isErr()) {
      return this.handleApiError('Failed to find record by ID', result.unwrapErr());
    }

    const data = result.unwrap();
    if (data.records.length === 0) {
      return Ok(null);
    }

    const recordResult = this.fromDTO(data.records[0]!);
    if (recordResult.isErr()) {
      return Err(recordResult.unwrapErr());
    }

    return Ok(recordResult.unwrap());
  }

  async findAll(
    options: RecordSearchOptions = {}
  ): Promise<Result<RecordSearchResult, DomainError>> {
    const result = await this.apiClient.searchRecords(undefined, {
      limit: options.limit,
      offset: options.offset,
    });

    if (result.isErr()) {
      return this.handleApiError('Failed to find all records', result.unwrapErr());
    }

    const data = result.unwrap();
    const recordsResult = this.fromDTOArray(data.records);
    if (recordsResult.isErr()) {
      return Err(recordsResult.unwrapErr());
    }

    return Ok({
      records: recordsResult.unwrap(),
      total: data.total,
      hasMore: options.offset !== undefined && options.limit !== undefined
        ? options.offset + options.limit < data.total
        : false,
    });
  }

  async search(
    query: SearchQuery,
    options: RecordSearchOptions = {}
  ): Promise<Result<RecordSearchResult, DomainError>> {
    const queryString = query.toString();

    const result = await this.apiClient.searchRecords(
      queryString.length > 0 ? queryString : undefined,
      {
        limit: options.limit,
        offset: options.offset,
      }
    );

    if (result.isErr()) {
      return this.handleApiError('Failed to search records', result.unwrapErr());
    }

    const data = result.unwrap();
    const recordsResult = this.fromDTOArray(data.records);
    if (recordsResult.isErr()) {
      return Err(recordsResult.unwrapErr());
    }

    return Ok({
      records: recordsResult.unwrap(),
      total: data.total,
      hasMore: options.offset !== undefined && options.limit !== undefined
        ? options.offset + options.limit < data.total
        : false,
    });
  }

  async findByTagIds(
    tagIds: TagId[],
    options: RecordSearchOptions = {}
  ): Promise<Result<RecordSearchResult, DomainError>> {
    // Use tag normalized values as search query
    const query = tagIds.map(id => id.toString()).join(' ');

    const result = await this.apiClient.searchRecords(query, {
      limit: options.limit,
      offset: options.offset,
    });

    if (result.isErr()) {
      return this.handleApiError('Failed to find records by tag IDs', result.unwrapErr());
    }

    const data = result.unwrap();
    const recordsResult = this.fromDTOArray(data.records);
    if (recordsResult.isErr()) {
      return Err(recordsResult.unwrapErr());
    }

    return Ok({
      records: recordsResult.unwrap(),
      total: data.total,
      hasMore: options.offset !== undefined && options.limit !== undefined
        ? options.offset + options.limit < data.total
        : false,
    });
  }

  async findByTagSet(
    tagIds: Set<TagId>,
    excludeRecordId?: RecordId
  ): Promise<Result<Record[], DomainError>> {
    // This requires finding all records and filtering locally
    // since the API doesn't support exact tag set matching
    const allRecordsResult = await this.findAll({ limit: 1000 });
    if (allRecordsResult.isErr()) {
      return Err(allRecordsResult.unwrapErr());
    }

    const tagIdSet = new Set(Array.from(tagIds).map(id => id.toString()));
    const filtered = allRecordsResult.unwrap().records.filter(record => {
      if (excludeRecordId && record.id.equals(excludeRecordId)) {
        return false;
      }
      const recordTagIds = new Set(Array.from(record.tagIds).map(id => id.toString()));
      if (recordTagIds.size !== tagIdSet.size) {
        return false;
      }
      for (const tagId of tagIdSet) {
        if (!recordTagIds.has(tagId)) {
          return false;
        }
      }
      return true;
    });

    return Ok(filtered);
  }

  async save(record: Record): Promise<Result<Record, DomainError>> {
    const content = record.content.toString();

    const result = await this.apiClient.createRecord({ content });

    if (result.isErr()) {
      return this.handleApiError('Failed to save record', result.unwrapErr());
    }

    const dto = result.unwrap();
    return this.fromDTO(dto);
  }

  async update(record: Record): Promise<Result<Record, DomainError>> {
    const content = record.content.toString();
    const id = record.id.toString();

    const result = await this.apiClient.updateRecord(id, { content });

    if (result.isErr()) {
      return this.handleApiError('Failed to update record', result.unwrapErr());
    }

    const dto = result.unwrap();
    return this.fromDTO(dto);
  }

  async delete(id: RecordId): Promise<Result<void, DomainError>> {
    const result = await this.apiClient.deleteRecord(id.toString());

    if (result.isErr()) {
      return this.handleApiError('Failed to delete record', result.unwrapErr());
    }

    return Ok(undefined);
  }

  async saveBatch(records: Record[]): Promise<Result<Record[], DomainError>> {
    // API doesn't support batch operations, so we save one by one
    const savedRecords: Record[] = [];

    for (const record of records) {
      const result = await this.save(record);
      if (result.isErr()) {
        return Err(result.unwrapErr());
      }
      savedRecords.push(result.unwrap());
    }

    return Ok(savedRecords);
  }

  async deleteAll(): Promise<Result<void, DomainError>> {
    // API doesn't support deleteAll, so we need to get all records and delete them
    const allRecordsResult = await this.findAll({ limit: 10000 });
    if (allRecordsResult.isErr()) {
      return Err(allRecordsResult.unwrapErr());
    }

    const records = allRecordsResult.unwrap().records;
    for (const record of records) {
      const result = await this.delete(record.id);
      if (result.isErr()) {
        return Err(result.unwrapErr());
      }
    }

    return Ok(undefined);
  }

  async count(): Promise<Result<number, DomainError>> {
    // Get count from search with limit 0
    const result = await this.apiClient.searchRecords(undefined, { limit: 0 });

    if (result.isErr()) {
      return this.handleApiError('Failed to count records', result.unwrapErr());
    }

    return Ok(result.unwrap().total);
  }

  async exists(id: RecordId): Promise<Result<boolean, DomainError>> {
    const result = await this.findById(id);
    if (result.isErr()) {
      return Err(result.unwrapErr());
    }
    return Ok(result.unwrap() !== null);
  }

  async getTagStatistics(): Promise<Result<Array<{ tag: string; count: number }>, DomainError>> {
    const result = await this.apiClient.getTagStatistics();

    if (result.isErr()) {
      return this.handleApiError('Failed to get tag statistics', result.unwrapErr());
    }

    return Ok(result.unwrap());
  }

  /**
   * Convert API DTO to domain Record entity
   */
  private fromDTO(dto: RecordDTO): Result<Record, DomainError> {
    try {
      const id = new RecordId(dto.id);
      const content = new RecordContent(dto.content);

      const tagIds = new Set<TagId>();
      for (const tagIdString of dto.tagIds) {
        tagIds.add(new TagId(tagIdString));
      }

      const createdAt = new Date(dto.createdAt);
      const updatedAt = new Date(dto.updatedAt);

      if (isNaN(createdAt.getTime())) {
        return Err(new DomainError('INVALID_DATA', 'Invalid createdAt date'));
      }

      if (isNaN(updatedAt.getTime())) {
        return Err(new DomainError('INVALID_DATA', 'Invalid updatedAt date'));
      }

      const record = new Record(
        id,
        content,
        tagIds,
        createdAt,
        updatedAt
      );

      return Ok(record);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Err(new DomainError('CONVERSION_ERROR', `Failed to convert DTO to Record: ${message}`));
    }
  }

  /**
   * Convert array of DTOs to domain entities
   */
  private fromDTOArray(dtos: RecordDTO[]): Result<Record[], DomainError> {
    const records: Record[] = [];

    for (const dto of dtos) {
      const result = this.fromDTO(dto);
      if (result.isErr()) {
        return Err(result.unwrapErr());
      }
      records.push(result.unwrap());
    }

    return Ok(records);
  }

  /**
   * Handle API errors and convert to DomainErrors
   */
  private handleApiError(
    message: string,
    error: ApiError
  ): Result<never, DomainError> {
    console.error(`${message}:`, error);

    // Map HTTP error codes to domain errors
    if (error.code === 'HTTP_404') {
      return Err(new DomainError('RECORD_NOT_FOUND', 'Record not found'));
    }

    if (error.code === 'HTTP_409') {
      return Err(new DomainError('DUPLICATE_RECORD', 'Record already exists'));
    }

    if (error.code === 'NETWORK_ERROR') {
      return Err(new DomainError('CONNECTION_ERROR', 'Network connection failed'));
    }

    if (error.code === 'TIMEOUT') {
      return Err(new DomainError('TIMEOUT_ERROR', 'Request timeout'));
    }

    return Err(new DomainError('API_ERROR', `${message}: ${error.message}`));
  }
}
