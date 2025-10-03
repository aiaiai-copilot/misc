import { Request, Response, NextFunction } from 'express';
import { validateUuidParam, validateRecordBody, validateSearchQuery } from '../validation';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  describe('validateUuidParam', () => {
    it('should call next() for valid UUID', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      mockRequest.params = { id: validUuid };

      const middleware = validateUuidParam('id');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid UUID format', () => {
      mockRequest.params = { id: 'invalid-uuid' };

      const middleware = validateUuidParam('id');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid record ID format',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 400 when parameter is missing', () => {
      mockRequest.params = {};

      const middleware = validateUuidParam('id');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Missing id parameter',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should validate custom parameter name', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      mockRequest.params = { recordId: validUuid };

      const middleware = validateUuidParam('recordId');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('validateRecordBody', () => {
    it('should call next() for valid content', () => {
      mockRequest.body = { content: 'Valid content' };

      validateRecordBody(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 400 when content is missing', () => {
      mockRequest.body = {};

      validateRecordBody(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Content is required and must be a string',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 400 when content is not a string', () => {
      mockRequest.body = { content: 123 };

      validateRecordBody(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Content is required and must be a string',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 400 when content is empty string', () => {
      mockRequest.body = { content: '   ' };

      validateRecordBody(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Content cannot be empty',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 400 when content is null', () => {
      mockRequest.body = { content: null };

      validateRecordBody(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Content is required and must be a string',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('validateSearchQuery', () => {
    it('should call next() when no query parameters are provided', () => {
      mockRequest.query = {};

      validateSearchQuery(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should call next() for valid limit and offset', () => {
      mockRequest.query = { limit: '50', offset: '10' };

      validateSearchQuery(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid limit (negative)', () => {
      mockRequest.query = { limit: '-1' };

      validateSearchQuery(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid limit parameter - must be a non-negative integer',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid limit (not a number)', () => {
      mockRequest.query = { limit: 'abc' };

      validateSearchQuery(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid limit parameter - must be a non-negative integer',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid offset (negative)', () => {
      mockRequest.query = { offset: '-5' };

      validateSearchQuery(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid offset parameter - must be a non-negative integer',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid offset (not a number)', () => {
      mockRequest.query = { offset: 'xyz' };

      validateSearchQuery(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid offset parameter - must be a non-negative integer',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should accept limit=0 and offset=0', () => {
      mockRequest.query = { limit: '0', offset: '0' };

      validateSearchQuery(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should preserve valid limit value', () => {
      mockRequest.query = { limit: '100' };

      validateSearchQuery(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.query.limit).toBe('100');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should preserve valid offset value', () => {
      mockRequest.query = { offset: '20' };

      validateSearchQuery(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.query.offset).toBe('20');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should allow other query parameters to pass through', () => {
      mockRequest.query = { limit: '10', offset: '0', q: 'search term' };

      validateSearchQuery(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.query.q).toBe('search term');
    });
  });
});
