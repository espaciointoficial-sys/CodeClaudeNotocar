import { DatabaseSync } from 'node:sqlite';
import { MIGRATIONS } from './migrations.ts';

/** Crea una base de datos SQLite en memoria con el esquema aplicado, para pruebas. */
export function createTestDatabase(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  for (const migration of MIGRATIONS) db.exec(migration);
  return db;
}
