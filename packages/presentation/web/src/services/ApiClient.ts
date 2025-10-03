import { Result, Ok, Err } from '@misc-poc/shared';

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface SearchResult<T> {
  records: T[];
  total: number;
}

export interface TagStatistic {
  tagId: string;
  name: string;
  count: number;
}

/**
 * HTTP API client for communicating with the backend REST API.
 * Provides error handling, timeout configuration, and response parsing.
 */
export class ApiClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly headers: Record<string, string>;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout ?? 30000; // 30 seconds default
    this.headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
  }

  /**
   * Perform a GET request
   */
  protected async get<T>(
    path: string,
    params?: Record<string, string | number>
  ): Promise<Result<T, ApiError>> {
    return this.request<T>('GET', path, undefined, params);
  }

  /**
   * Perform a POST request
   */
  protected async post<T>(
    path: string,
    body?: unknown
  ): Promise<Result<T, ApiError>> {
    return this.request<T>('POST', path, body);
  }

  /**
   * Perform a PUT request
   */
  protected async put<T>(
    path: string,
    body?: unknown
  ): Promise<Result<T, ApiError>> {
    return this.request<T>('PUT', path, body);
  }

  /**
   * Perform a DELETE request
   */
  protected async delete<T>(
    path: string
  ): Promise<Result<T, ApiError>> {
    return this.request<T>('DELETE', path);
  }

  /**
   * Core request method with error handling and timeout
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string | number>
  ): Promise<Result<T, ApiError>> {
    try {
      const url = this.buildUrl(path, params);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          method,
          headers: this.headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          return this.handleErrorResponse(response);
        }

        // Handle 204 No Content responses
        if (response.status === 204) {
          return Ok(undefined as T);
        }

        const data = await response.json();
        return Ok(data as T);
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      return this.handleNetworkError(error);
    }
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(path: string, params?: Record<string, string | number>): string {
    const url = new URL(path, this.baseUrl);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    return url.toString();
  }

  /**
   * Handle HTTP error responses
   */
  private async handleErrorResponse<T>(response: Response): Promise<Result<T, ApiError>> {
    try {
      const errorData = await response.json();
      return Err({
        code: `HTTP_${response.status}`,
        message: errorData.error || errorData.message || response.statusText,
        details: errorData,
      });
    } catch {
      return Err({
        code: `HTTP_${response.status}`,
        message: response.statusText,
      });
    }
  }

  /**
   * Handle network and timeout errors
   */
  private handleNetworkError<T>(error: unknown): Result<T, ApiError> {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return Err({
          code: 'TIMEOUT',
          message: `Request timeout after ${this.timeout}ms`,
        });
      }

      return Err({
        code: 'NETWORK_ERROR',
        message: error.message,
        details: error,
      });
    }

    return Err({
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      details: error,
    });
  }
}
