import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApiClient } from '../ApiClient.js';

// Test implementation that exposes protected methods
class TestApiClient extends ApiClient {
  public async testGet<T>(path: string, params?: Record<string, string | number>): Promise<import('@misc-poc/shared').Result<T, import('../ApiClient.js').ApiError>> {
    return this.get<T>(path, params);
  }

  public async testPost<T>(path: string, body?: unknown): Promise<import('@misc-poc/shared').Result<T, import('../ApiClient.js').ApiError>> {
    return this.post<T>(path, body);
  }

  public async testPut<T>(path: string, body?: unknown): Promise<import('@misc-poc/shared').Result<T, import('../ApiClient.js').ApiError>> {
    return this.put<T>(path, body);
  }

  public async testDelete<T>(path: string): Promise<import('@misc-poc/shared').Result<T, import('../ApiClient.js').ApiError>> {
    return this.delete<T>(path);
  }
}

describe('ApiClient', () => {
  let client: TestApiClient;
  const baseUrl = 'http://localhost:3000';

  beforeEach(() => {
    client = new TestApiClient({ baseUrl, timeout: 5000 });
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET requests', () => {
    it('should perform successful GET request', async () => {
      const mockData = { id: '1', name: 'test' };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await client.testGet<typeof mockData>('/api/test');

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/api/test`,
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should handle GET request with query parameters', async () => {
      const mockData = { items: [] };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await client.testGet<typeof mockData>('/api/items', {
        limit: 10,
        offset: 0,
        q: 'search',
      });

      expect(result.isOk()).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/api/items?limit=10&offset=0&q=search`,
        expect.any(Object)
      );
    });
  });

  describe('POST requests', () => {
    it('should perform successful POST request', async () => {
      const requestBody = { content: 'test' };
      const responseData = { id: '1', ...requestBody };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => responseData,
      });

      const result = await client.testPost<typeof responseData>('/api/records', requestBody);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(responseData);
      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/api/records`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
        })
      );
    });
  });

  describe('PUT requests', () => {
    it('should perform successful PUT request', async () => {
      const requestBody = { content: 'updated' };
      const responseData = { id: '1', ...requestBody };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => responseData,
      });

      const result = await client.testPut<typeof responseData>('/api/records/1', requestBody);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(responseData);
    });
  });

  describe('DELETE requests', () => {
    it('should perform successful DELETE request with 204 response', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await client.testDelete<void>('/api/records/1');

      expect(result.isOk()).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/api/records/1`,
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle HTTP 404 error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Record not found' }),
      });

      const result = await client.testGet<unknown>('/api/records/999');

      expect(result.isErr()).toBe(true);
      const error = result.unwrapErr();
      expect(error.code).toBe('HTTP_404');
      expect(error.message).toBe('Record not found');
    });

    it('should handle HTTP 500 error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
      });

      const result = await client.testGet<unknown>('/api/test');

      expect(result.isErr()).toBe(true);
      const error = result.unwrapErr();
      expect(error.code).toBe('HTTP_500');
      expect(error.message).toBe('Server error');
    });

    it('should handle network error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network failure')
      );

      const result = await client.testGet<unknown>('/api/test');

      expect(result.isErr()).toBe(true);
      const error = result.unwrapErr();
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.message).toBe('Network failure');
    });

    it('should handle timeout error', async () => {
      const shortTimeoutClient = new TestApiClient({ baseUrl, timeout: 100 });

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

      const result = await shortTimeoutClient.testGet<unknown>('/api/slow');

      expect(result.isErr()).toBe(true);
      const error = result.unwrapErr();
      expect(error.code).toBe('TIMEOUT');
      expect(error.message).toContain('timeout');
    });

    it('should handle error response without JSON body', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const result = await client.testGet<unknown>('/api/test');

      expect(result.isErr()).toBe(true);
      const error = result.unwrapErr();
      expect(error.code).toBe('HTTP_400');
      expect(error.message).toBe('Bad Request');
    });
  });

  describe('Configuration', () => {
    it('should use custom headers', async () => {
      const customClient = new TestApiClient({
        baseUrl,
        headers: { Authorization: 'Bearer token123' },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      });

      await customClient.testGet<unknown>('/api/test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer token123',
          }),
        })
      );
    });

    it('should use default timeout when not specified', async () => {
      const defaultClient = new TestApiClient({ baseUrl });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      });

      const result = await defaultClient.testGet<unknown>('/api/test');
      expect(result.isOk()).toBe(true);
    });
  });
});
