/**
 * Database module exports
 */

export * from './init';
export * from './utils';
export * from './schema';

// Re-export Database type from better-sqlite3
export type { Database } from 'better-sqlite3';
