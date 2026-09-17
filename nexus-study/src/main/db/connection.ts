import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { MIGRATIONS } from './migrations.ts';

let db: DatabaseSync | null = null;

export function openDatabase(userDataDir: string): DatabaseSync {
  if (db) return db;

  const dbPath = join(userDataDir, 'nexus-study.db');
  db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');
  runMigrations(db);
  return db;
}

function runMigrations(database: DatabaseSync): void {
  const currentVersion = database.prepare('PRAGMA user_version').get() as { user_version: number };
  let version = currentVersion.user_version;

  while (version < MIGRATIONS.length) {
    const migration = MIGRATIONS[version];
    if (!migration) break;
    database.exec(migration);
    version += 1;
    database.exec(`PRAGMA user_version = ${version};`);
  }
}

export function getDatabase(): DatabaseSync {
  if (!db) throw new Error('La base de datos no ha sido inicializada todavía.');
  return db;
}
