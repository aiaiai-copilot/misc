/**
 * PostgreSQL connection management
 */

import { Pool, PoolConfig } from 'pg';

export interface PostgresConfig extends PoolConfig {
  // Extend PoolConfig with any custom configuration
}

/**
 * Create a PostgreSQL connection pool
 */
export function createConnectionPool(config: PostgresConfig): Pool {
  return new Pool(config);
}
