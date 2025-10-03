import { Request, Response, NextFunction } from 'express';
import { RecordId } from '@misc-poc/shared';

/**
 * Middleware to validate UUID format in route parameters
 * Used for endpoints like PUT /api/records/:id and DELETE /api/records/:id
 */
export const validateUuidParam = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const id = req.params[paramName];

    if (!id) {
      res.status(400).json({ error: `Missing ${paramName} parameter` });
      return;
    }

    try {
      // Use RecordId validation to ensure UUID format is correct
      new RecordId(id);
      next();
    } catch {
      res.status(400).json({ error: 'Invalid record ID format' });
    }
  };
};

/**
 * Middleware to validate request body for POST/PUT endpoints
 * Ensures the 'content' field is present and is a non-empty string
 */
export const validateRecordBody = (req: Request, res: Response, next: NextFunction): void => {
  const { content } = req.body;

  if (!content || typeof content !== 'string') {
    res.status(400).json({ error: 'Content is required and must be a string' });
    return;
  }

  if (content.trim().length === 0) {
    res.status(400).json({ error: 'Content cannot be empty' });
    return;
  }

  next();
};

/**
 * Middleware to validate query parameters for GET /api/records
 * Validates 'limit' and 'offset' are valid positive integers
 */
export const validateSearchQuery = (req: Request, res: Response, next: NextFunction): void => {
  const { limit, offset } = req.query;

  // Validate limit if provided
  if (limit !== undefined) {
    const parsedLimit = parseInt(limit as string, 10);
    if (isNaN(parsedLimit) || parsedLimit < 0) {
      res.status(400).json({ error: 'Invalid limit parameter - must be a non-negative integer' });
      return;
    }
    // Store parsed value for later use
    req.query.limit = String(parsedLimit);
  }

  // Validate offset if provided
  if (offset !== undefined) {
    const parsedOffset = parseInt(offset as string, 10);
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      res.status(400).json({ error: 'Invalid offset parameter - must be a non-negative integer' });
      return;
    }
    // Store parsed value for later use
    req.query.offset = String(parsedOffset);
  }

  next();
};
