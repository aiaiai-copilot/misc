/**
 * PostgreSQL connection management
 */

import { Pool, PoolConfig, PoolClient } from 'pg';

export interface PostgresConfig extends PoolConfig {
  // Extend PoolConfig with any custom configuration
}

/**
 * Default connection configuration based on docker-compose.yml
 */
export const DEFAULT_CONFIG: PostgresConfig = {
  user: 'misc',
  password: 'misc_password',
  host: 'localhost',
  port: 5432,
  database: 'misc',
  // Connection pool settings
  max: 20, // maximum pool size
  idleTimeoutMillis: 30000, // close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // fail connection after 2 seconds
  maxLifetimeSeconds: 60 * 30, // rotate connections every 30 minutes
};

/**
 * Create a PostgreSQL connection pool with proper configuration and error handling
 */
export function createConnectionPool(config: PostgresConfig = DEFAULT_CONFIG): Pool {
  const pool = new Pool(config);

  // Handle errors from idle clients
  pool.on('error', (err: Error, _client: PoolClient) => {
    console.error('Unexpected error on idle client', err);
    // The client will be automatically removed from the pool
  });

  // Log when new clients connect (useful for debugging)
  pool.on('connect', (_client: PoolClient) => {
    // Optionally configure client settings here
    // e.g., _client.query('SET DATESTYLE = iso, mdy')
  });

  return pool;
}

/**
 * Create connection pool from connection string
 */
export function createConnectionPoolFromUri(connectionString: string): Pool {
  return createConnectionPool({ connectionString });
}

/**
 * Gracefully shutdown a connection pool
 */
export async function closeConnectionPool(pool: Pool): Promise<void> {
  await pool.end();
}
