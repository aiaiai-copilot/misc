import { Request, Response, NextFunction } from 'express';
import { DomainError } from '@misc-poc/domain';

/**
 * Maps domain error codes to appropriate HTTP status codes
 */
const ERROR_CODE_TO_STATUS: Record<string, number> = {
  // Not Found errors - 404
  RECORD_NOT_FOUND: 404,
  TAG_NOT_FOUND: 404,

  // Validation/Bad Request errors - 400
  INVALID_RECORD_CONTENT: 400,
  INVALID_TAG: 400,
  DUPLICATE_RECORD: 400,
  TAG_LIMIT_EXCEEDED: 400,
  VALIDATION_ERROR: 400,

  // Default server error - 500
  DATABASE_ERROR: 500,
  UNKNOWN_ERROR: 500,
};

/**
 * Standard error response format
 */
interface ErrorResponse {
  error: string;
  message?: string;
  code?: string;
}

/**
 * Determines the appropriate HTTP status code for an error
 */
function getStatusCode(error: Error): number {
  // Domain errors use error code mapping
  if (error instanceof DomainError) {
    return ERROR_CODE_TO_STATUS[error.code] || 500;
  }

  // Validation errors (caught by middleware should not reach here, but handle anyway)
  if (error.message.includes('Invalid') || error.message.includes('required')) {
    return 400;
  }

  // Database/connection errors
  if (error.message.includes('database') || error.message.includes('connection')) {
    return 500;
  }

  // Default to internal server error
  return 500;
}

/**
 * Creates a standard error response object
 */
function createErrorResponse(error: Error, isDevelopment: boolean): ErrorResponse {
  const response: ErrorResponse = {
    error: error.message,
  };

  // Include error code for domain errors
  if (error instanceof DomainError) {
    response.code = error.code;
  }

  // Include additional details in development mode
  if (isDevelopment && error.stack) {
    response.message = error.stack;
  }

  return response;
}

/**
 * Global error handling middleware
 *
 * This middleware should be registered AFTER all routes to catch any errors
 * that were not handled by route-specific error handling.
 *
 * Usage in index.ts:
 * ```
 * app.use('/api', apiRouter);
 * app.use(errorHandler);
 * ```
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Log error for debugging (in production, this would go to a logging service)
  console.error('Error caught by error handler:', {
    name: err.name,
    message: err.message,
    code: err instanceof DomainError ? err.code : undefined,
    stack: isDevelopment ? err.stack : undefined,
  });

  const statusCode = getStatusCode(err);
  const errorResponse = createErrorResponse(err, isDevelopment);

  res.status(statusCode).json(errorResponse);
};

/**
 * Async route handler wrapper to automatically catch errors
 * and pass them to error handling middleware
 *
 * Usage:
 * ```
 * router.get('/records', asyncHandler(async (req, res) => {
 *   const result = await repository.findAll();
 *   if (result.isErr()) {
 *     throw result.unwrapErr();
 *   }
 *   res.json(result.unwrap());
 * }));
 * ```
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found handler
 * Should be registered after all routes but before error handler
 */
export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({ error: 'Not Found' });
};
