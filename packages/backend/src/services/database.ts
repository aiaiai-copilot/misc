import { Pool } from 'pg';
import { createConnectionPool, PostgresConfig } from '@misc-poc/infrastructure-postgresql';

let pool: Pool | null = null;

/**
 * Get or create the PostgreSQL connection pool
 */
export function getDatabasePool(): Pool {
  if (!pool) {
    const config: PostgresConfig = {
      user: process.env.POSTGRES_USER || 'misc',
      password: process.env.POSTGRES_PASSWORD || 'misc_password',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      database: process.env.POSTGRES_DB || 'misc',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      maxLifetimeSeconds: 60 * 30,
    };

    pool = createConnectionPool(config);
  }

  if (!pool) {
    throw new Error('Failed to create database connection pool');
  }

  return pool;
}

/**
 * Close the database pool gracefully
 */
export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
