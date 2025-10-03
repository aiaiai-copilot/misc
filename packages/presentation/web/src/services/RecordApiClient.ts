import { Result } from '@misc-poc/shared';
import { ApiClient, ApiError, SearchResult, TagStatistic, ApiClientConfig } from './ApiClient.js';

export interface RecordDTO {
  id: string;
  content: string;
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecordRequest {
  content: string;
}

export interface UpdateRecordRequest {
  content: string;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
}

/**
 * API client for record-related operations.
 * Maps REST API endpoints to domain operations.
 */
export class RecordApiClient extends ApiClient {
  constructor(config: ApiClientConfig) {
    super(config);
  }

  /**
   * Search/list records with optional query and pagination
   */
  async searchRecords(
    query?: string,
    options?: SearchOptions
  ): Promise<Result<SearchResult<RecordDTO>, ApiError>> {
    const params: Record<string, string | number> = {
      limit: options?.limit ?? 100,
      offset: options?.offset ?? 0,
    };

    if (query && query.trim().length > 0) {
      params.q = query.trim();
    }

    return this.get<SearchResult<RecordDTO>>('/api/records', params);
  }

  /**
   * Create a new record
   */
  async createRecord(
    request: CreateRecordRequest
  ): Promise<Result<RecordDTO, ApiError>> {
    return this.post<RecordDTO>('/api/records', request);
  }

  /**
   * Update an existing record
   */
  async updateRecord(
    id: string,
    request: UpdateRecordRequest
  ): Promise<Result<RecordDTO, ApiError>> {
    return this.put<RecordDTO>(`/api/records/${id}`, request);
  }

  /**
   * Delete a record
   */
  async deleteRecord(id: string): Promise<Result<void, ApiError>> {
    return this.delete<void>(`/api/records/${id}`);
  }

  /**
   * Get tag statistics for tag cloud
   */
  async getTagStatistics(): Promise<Result<TagStatistic[], ApiError>> {
    return this.get<TagStatistic[]>('/api/tags');
  }
}
