import { Request, Response, NextFunction } from 'express';
import { DomainError } from '@misc-poc/domain';
import { errorHandler, asyncHandler, notFoundHandler } from '../errorHandler';

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('errorHandler', () => {
    it('should handle DomainError with appropriate status code', () => {
      const error = new DomainError('RECORD_NOT_FOUND', 'Record not found');

      errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Record not found',
        code: 'RECORD_NOT_FOUND',
      });
    });

    it('should map INVALID_RECORD_CONTENT to 400', () => {
      const error = new DomainError('INVALID_RECORD_CONTENT', 'Content is invalid');

      errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Content is invalid',
        code: 'INVALID_RECORD_CONTENT',
      });
    });

    it('should map TAG_LIMIT_EXCEEDED to 400', () => {
      const error = new DomainError('TAG_LIMIT_EXCEEDED', 'Too many tags');

      errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Too many tags',
        code: 'TAG_LIMIT_EXCEEDED',
      });
    });

    it('should handle standard Error with 500 status', () => {
      const error = new Error('Database connection failed');

      errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Database connection failed',
      });
    });

    it('should include stack trace in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      error.stack = 'Error: Test error\n  at test.js:1:1';

      errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Test error',
          message: expect.stringContaining('Error: Test error'),
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Test error');
      error.stack = 'Error: Test error\n  at test.js:1:1';

      errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Test error',
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should log error details', () => {
      const error = new DomainError('TEST_ERROR', 'Test message');

      errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error caught by error handler:',
        expect.objectContaining({
          name: 'DomainError',
          message: 'Test message',
          code: 'TEST_ERROR',
        })
      );
    });

    it('should handle DomainError with unknown code as 500', () => {
      const error = new DomainError('UNKNOWN_ERROR_CODE', 'Unknown error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unknown error',
        code: 'UNKNOWN_ERROR_CODE',
      });
    });
  });

  describe('asyncHandler', () => {
    it('should call the wrapped function', async () => {
      const fn = jest.fn().mockResolvedValue(undefined);
      const handler = asyncHandler(fn);

      await handler(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(fn).toHaveBeenCalledWith(mockRequest, mockResponse, nextFunction);
    });

    it('should pass errors to next function', async () => {
      const error = new Error('Async error');
      const fn = jest.fn().mockRejectedValue(error);
      const handler = asyncHandler(fn);

      await handler(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(error);
    });

    it('should handle synchronous errors thrown in async function', async () => {
      const error = new Error('Sync error');
      const fn = jest.fn(async () => {
        throw error;
      });
      const handler = asyncHandler(fn);

      await handler(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(error);
    });

    it('should work with successful async operations', async () => {
      const fn = jest.fn(async (_req: Request, res: Response) => {
        res.json({ success: true });
      });
      const handler = asyncHandler(fn);

      await handler(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.json).toHaveBeenCalledWith({ success: true });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404 with error message', () => {
      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Not Found' });
    });
  });
});
