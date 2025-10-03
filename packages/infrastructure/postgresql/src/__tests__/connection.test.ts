/**
 * Tests for PostgreSQL connection management
 */

import { Pool } from 'pg';
import {
  createConnectionPool,
  createConnectionPoolFromUri,
  closeConnectionPool,
  DEFAULT_CONFIG,
} from '../connection';

describe('PostgreSQL Connection Management', () => {
  describe('createConnectionPool', () => {
    it('should create a pool with default configuration', () => {
      const pool = createConnectionPool();

      expect(pool).toBeInstanceOf(Pool);
    });

    it('should create a pool with custom configuration', () => {
      const customConfig = {
        ...DEFAULT_CONFIG,
        max: 10,
      };

      const pool = createConnectionPool(customConfig);

      expect(pool).toBeInstanceOf(Pool);
    });

    it('should attach error handler to the pool', () => {
      const pool = createConnectionPool();

      // Check that error listeners are attached
      expect(pool.listenerCount('error')).toBeGreaterThan(0);
    });

    it('should attach connect handler to the pool', () => {
      const pool = createConnectionPool();

      // Check that connect listeners are attached
      expect(pool.listenerCount('connect')).toBeGreaterThan(0);
    });
  });

  describe('createConnectionPoolFromUri', () => {
    it('should create a pool from connection string', () => {
      const connectionString = 'postgresql://misc:misc_password@localhost:5432/misc';
      const pool = createConnectionPoolFromUri(connectionString);

      expect(pool).toBeInstanceOf(Pool);
    });
  });

  describe('closeConnectionPool', () => {
    it('should gracefully close the pool', async () => {
      const pool = createConnectionPool();
      const endSpy = jest.spyOn(pool, 'end');

      await closeConnectionPool(pool);

      expect(endSpy).toHaveBeenCalled();
    });
  });

  describe('DEFAULT_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_CONFIG).toEqual({
        user: 'misc',
        password: 'misc_password',
        host: 'localhost',
        port: 5432,
        database: 'misc',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        maxLifetimeSeconds: 1800,
      });
    });
  });
});
