/**
 * API-based implementation of UnitOfWork
 *
 * Since the API doesn't support transactions in the traditional sense,
 * this implementation provides a simple wrapper around the repositories.
 * Transactions are handled at the backend level.
 */

import { UnitOfWork } from '@misc-poc/application';
import { DomainError } from '@misc-poc/domain';
import { Result, Ok } from '@misc-poc/shared';
import { ApiRecordRepository } from './api-record-repository.js';
import { ApiTagRepository } from './api-tag-repository.js';

export class ApiUnitOfWork implements UnitOfWork {
  constructor(
    public readonly records: ApiRecordRepository,
    public readonly tags: ApiTagRepository
  ) {}

  async begin(): Promise<Result<void, DomainError>> {
    // API handles transactions at backend level, no-op for frontend
    return Ok(undefined);
  }

  async commit(): Promise<Result<void, DomainError>> {
    // API handles transactions at backend level, no-op for frontend
    return Ok(undefined);
  }

  async rollback(): Promise<Result<void, DomainError>> {
    // API handles transactions at backend level, no-op for frontend
    return Ok(undefined);
  }

  async execute<T>(
    operation: (uow: UnitOfWork) => Promise<Result<T, DomainError>>
  ): Promise<Result<T, DomainError>> {
    // Simply execute the operation without explicit transaction management
    // The backend API handles atomicity
    return operation(this);
  }

  isActive(): boolean {
    // Always return false as we don't manage transactions on frontend
    return false;
  }

  async dispose(): Promise<void> {
    // No resources to dispose for API-based implementation
  }
}
