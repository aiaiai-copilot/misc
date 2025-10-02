/**
 * PostgreSQL infrastructure implementation
 *
 * This package provides PostgreSQL-based implementations of repository interfaces.
 */

export { PostgresRecordRepository } from './postgres-record-repository.js';
export { createConnectionPool, type PostgresConfig } from './connection.js';
