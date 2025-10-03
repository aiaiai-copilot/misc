import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RecordApiClient, type RecordDTO } from '../RecordApiClient.js';

describe('RecordApiClient', () => {
  let client: RecordApiClient;
  const baseUrl = 'http://localhost:3000';

  beforeEach(() => {
    client = new RecordApiClient({ baseUrl });
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchRecords', () => {
    it('should search records with query', async () => {
      const mockResponse = {
        records: [
          {
            id: '1',
            content: 'test tag',
            tagIds: [],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        total: 1,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.searchRecords('test', { limit: 10, offset: 0 });

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/api/records?limit=10&offset=0&q=test`,
        expect.any(Object)
      );
    });

    it('should list all records without query', async () => {
      const mockResponse = {
        records: [],
        total: 0,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.searchRecords();

      expect(result.isOk()).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/api/records?limit=100&offset=0`,
        expect.any(Object)
      );
    });

    it('should use default pagination when not specified', async () => {
      const mockResponse = { records: [], total: 0 };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      await client.searchRecords('query');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=100&offset=0'),
        expect.any(Object)
      );
    });

    it('should trim whitespace from query', async () => {
      const mockResponse = { records: [], total: 0 };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      await client.searchRecords('  test  ');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('q=test'),
        expect.any(Object)
      );
    });

    it('should not include query param for empty string', async () => {
      const mockResponse = { records: [], total: 0 };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      await client.searchRecords('   ');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.not.stringContaining('q='),
        expect.any(Object)
      );
    });
  });

  describe('createRecord', () => {
    it('should create a new record', async () => {
      const mockRecord: RecordDTO = {
        id: '1',
        content: 'tag1 tag2',
        tagIds: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockRecord,
      });

      const result = await client.createRecord({ content: 'tag1 tag2' });

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(mockRecord);
      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/api/records`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ content: 'tag1 tag2' }),
        })
      );
    });

    it('should handle creation errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid content' }),
      });

      const result = await client.createRecord({ content: '' });

      expect(result.isErr()).toBe(true);
      const error = result.unwrapErr();
      expect(error.code).toBe('HTTP_400');
      expect(error.message).toBe('Invalid content');
    });
  });

  describe('updateRecord', () => {
    it('should update an existing record', async () => {
      const mockRecord: RecordDTO = {
        id: '1',
        content: 'updated tag',
        tagIds: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockRecord,
      });

      const result = await client.updateRecord('1', { content: 'updated tag' });

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(mockRecord);
      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/api/records/1`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ content: 'updated tag' }),
        })
      );
    });

    it('should handle record not found', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Record not found' }),
      });

      const result = await client.updateRecord('999', { content: 'test' });

      expect(result.isErr()).toBe(true);
      const error = result.unwrapErr();
      expect(error.code).toBe('HTTP_404');
    });
  });

  describe('deleteRecord', () => {
    it('should delete a record', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await client.deleteRecord('1');

      expect(result.isOk()).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/api/records/1`,
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should handle delete errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Record not found' }),
      });

      const result = await client.deleteRecord('999');

      expect(result.isErr()).toBe(true);
      const error = result.unwrapErr();
      expect(error.code).toBe('HTTP_404');
    });
  });

  describe('getTagStatistics', () => {
    it('should get tag statistics', async () => {
      const mockStats = [
        { tagId: '1', name: 'tag1', count: 5 },
        { tagId: '2', name: 'tag2', count: 3 },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockStats,
      });

      const result = await client.getTagStatistics();

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(mockStats);
      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/api/tags`,
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should handle server errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Database error' }),
      });

      const result = await client.getTagStatistics();

      expect(result.isErr()).toBe(true);
      const error = result.unwrapErr();
      expect(error.code).toBe('HTTP_500');
    });
  });

  describe('Network failures', () => {
    it('should handle network timeout', async () => {
      const shortTimeoutClient = new RecordApiClient({ baseUrl, timeout: 100 });

      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
        (_url, options) =>
          new Promise((_resolve, reject) => {
            // Simulate abort signal timeout
            if (options?.signal) {
              options.signal.addEventListener('abort', () => {
                const error = new Error('The operation was aborted');
                error.name = 'AbortError';
                reject(error);
              });
            }
          })
      );

      const result = await shortTimeoutClient.searchRecords();

      expect(result.isErr()).toBe(true);
      const error = result.unwrapErr();
      expect(error.code).toBe('TIMEOUT');
    });

    it('should handle connection refused', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Failed to fetch')
      );

      const result = await client.searchRecords();

      expect(result.isErr()).toBe(true);
      const error = result.unwrapErr();
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.message).toBe('Failed to fetch');
    });
  });
});
