import { ApiRecordRepository, ApiClient, RecordDTO, SearchResult, ApiError } from '../api-record-repository.js';
import { Record, DomainError } from '@misc-poc/domain';
import { RecordId, TagId, RecordContent, SearchQuery, Result, Ok, Err } from '@misc-poc/shared';

// Mock API Client
class MockApiClient implements ApiClient {
  private records: Map<string, RecordDTO> = new Map();
  private tagStatistics: Array<{ tag: string; count: number }> = [];

  setRecords(records: RecordDTO[]): void {
    this.records.clear();
    for (const record of records) {
      this.records.set(record.id, record);
    }
  }

  setTagStatistics(stats: Array<{ tag: string; count: number }>): void {
    this.tagStatistics = stats;
  }

  async searchRecords(
    query?: string,
    options?: { limit?: number; offset?: number }
  ): Promise<Result<SearchResult<RecordDTO>, ApiError>> {
    const allRecords = Array.from(this.records.values());
    let filtered = allRecords;

    if (query) {
      filtered = allRecords.filter(r =>
        r.content.includes(query) || r.tagIds.some(t => t.includes(query))
      );
    }

    const total = filtered.length;
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? filtered.length;

    const records = filtered.slice(offset, offset + limit);

    return Ok({ records, total });
  }

  async createRecord(request: { content: string }): Promise<Result<RecordDTO, ApiError>> {
    const dto: RecordDTO = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      content: request.content,
      tagIds: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'], // Mock returns a tag
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.records.set(dto.id, dto);
    return Ok(dto);
  }

  async updateRecord(id: string, request: { content: string }): Promise<Result<RecordDTO, ApiError>> {
    const record = this.records.get(id);
    if (!record) {
      return Err({ code: 'HTTP_404', message: 'Record not found' });
    }

    const updated: RecordDTO = {
      ...record,
      content: request.content,
      updatedAt: new Date().toISOString(),
    };
    this.records.set(id, updated);
    return Ok(updated);
  }

  async deleteRecord(id: string): Promise<Result<void, ApiError>> {
    if (!this.records.has(id)) {
      return Err({ code: 'HTTP_404', message: 'Record not found' });
    }
    this.records.delete(id);
    return Ok(undefined);
  }

  async getTagStatistics(): Promise<Result<Array<{ tag: string; count: number }>, ApiError>> {
    return Ok(this.tagStatistics);
  }
}

describe('ApiRecordRepository', () => {
  let repository: ApiRecordRepository;
  let mockClient: MockApiClient;

  beforeEach(() => {
    mockClient = new MockApiClient();
    repository = new ApiRecordRepository(mockClient);
  });

  describe('findAll', () => {
    it('should return all records', async () => {
      const dtos: RecordDTO[] = [
        {
          id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          content: '#tag1 content1',
          tagIds: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          content: '#tag2 content2',
          tagIds: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'],
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
        },
      ];

      mockClient.setRecords(dtos);

      const result = await repository.findAll();

      expect(result.isOk()).toBe(true);
      const searchResult = result.unwrap();
      expect(searchResult.records).toHaveLength(2);
      expect(searchResult.total).toBe(2);
      expect(searchResult.hasMore).toBe(false);
    });

    it('should handle pagination', async () => {
      const dtos: RecordDTO[] = [
        {
          id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          content: '#tag1 content1',
          tagIds: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          content: '#tag2 content2',
          tagIds: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'],
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
        },
      ];

      mockClient.setRecords(dtos);

      const result = await repository.findAll({ limit: 1, offset: 0 });

      expect(result.isOk()).toBe(true);
      const searchResult = result.unwrap();
      expect(searchResult.records).toHaveLength(1);
      expect(searchResult.total).toBe(2);
      expect(searchResult.hasMore).toBe(true);
    });
  });

  describe('search', () => {
    it('should search records by query', async () => {
      const dtos: RecordDTO[] = [
        {
          id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          content: '#tag1 content1',
          tagIds: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          content: '#tag2 content2',
          tagIds: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'],
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
        },
      ];

      mockClient.setRecords(dtos);

      const query = new SearchQuery('tag1');
      const result = await repository.search(query);

      expect(result.isOk()).toBe(true);
      const searchResult = result.unwrap();
      expect(searchResult.records).toHaveLength(1);
      expect(searchResult.records[0]?.content.toString()).toBe('#tag1 content1');
    });
  });

  describe('save', () => {
    it('should save a new record', async () => {
      const content = new RecordContent('#tag1 new content');
      const tagIds = new Set([new TagId('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')]);
      const record = Record.create(content, tagIds);

      const result = await repository.save(record);

      expect(result.isOk()).toBe(true);
      const savedRecord = result.unwrap();
      expect(savedRecord.content.toString()).toBe('#tag1 new content');
    });
  });

  describe('update', () => {
    it('should update an existing record', async () => {
      const dto: RecordDTO = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        content: '#tag1 old content',
        tagIds: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockClient.setRecords([dto]);

      const content = new RecordContent('#tag1 updated content');
      const tagIds = new Set([new TagId('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')]);
      const record = new Record(
        new RecordId('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
        content,
        tagIds,
        new Date('2024-01-01T00:00:00.000Z'),
        new Date()
      );

      const result = await repository.update(record);

      expect(result.isOk()).toBe(true);
      const updatedRecord = result.unwrap();
      expect(updatedRecord.content.toString()).toBe('#tag1 updated content');
    });

    it('should return error when record not found', async () => {
      const content = new RecordContent('#tag1 content');
      const tagIds = new Set([new TagId('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')]);
      const record = new Record(
        new RecordId('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
        content,
        tagIds,
        new Date(),
        new Date()
      );

      const result = await repository.update(record);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBeInstanceOf(DomainError);
    });
  });

  describe('delete', () => {
    it('should delete a record', async () => {
      const dto: RecordDTO = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        content: '#tag1 content',
        tagIds: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockClient.setRecords([dto]);

      const id = new RecordId('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
      const result = await repository.delete(id);

      expect(result.isOk()).toBe(true);
    });

    it('should return error when record not found', async () => {
      const id = new RecordId('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
      const result = await repository.delete(id);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBeInstanceOf(DomainError);
    });
  });

  describe('count', () => {
    it('should return the count of records', async () => {
      const dtos: RecordDTO[] = [
        {
          id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          content: '#tag1 content1',
          tagIds: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          content: '#tag2 content2',
          tagIds: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'],
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
        },
      ];

      mockClient.setRecords(dtos);

      const result = await repository.count();

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(2);
    });
  });

  describe('getTagStatistics', () => {
    it('should return tag statistics', async () => {
      const stats = [
        { tag: 'tag1', count: 5 },
        { tag: 'tag2', count: 3 },
      ];

      mockClient.setTagStatistics(stats);

      const result = await repository.getTagStatistics();

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(stats);
    });
  });
});
