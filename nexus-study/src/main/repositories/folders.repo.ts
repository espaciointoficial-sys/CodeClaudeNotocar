import type { DatabaseSync } from 'node:sqlite';
import type { Folder, FolderInput } from '@shared/types';
import { newId, nowIso, NotFoundError, ValidationError } from '../lib/util.ts';

interface FolderRow {
  id: string;
  subject_id: string;
  name: string;
  description: string | null;
  position: number;
  created_at: string;
}

function rowToFolder(row: FolderRow): Folder {
  return {
    id: row.id,
    subjectId: row.subject_id,
    name: row.name,
    description: row.description,
    position: row.position,
    createdAt: row.created_at,
  };
}

export class FoldersRepository {
  constructor(private readonly db: DatabaseSync) {}

  listBySubject(subjectId: string): Folder[] {
    const rows = this.db
      .prepare('SELECT * FROM folders WHERE subject_id = ? ORDER BY position ASC, created_at ASC')
      .all(subjectId) as unknown as FolderRow[];
    return rows.map(rowToFolder);
  }

  get(id: string): Folder | null {
    const row = this.db.prepare('SELECT * FROM folders WHERE id = ?').get(id) as unknown as FolderRow | undefined;
    return row ? rowToFolder(row) : null;
  }

  create(input: FolderInput): Folder {
    if (input.name.trim().length === 0) throw new ValidationError('El nombre del tema es obligatorio.');
    const maxPosition = this.db
      .prepare('SELECT COALESCE(MAX(position), -1) AS maxPos FROM folders WHERE subject_id = ?')
      .get(input.subjectId) as { maxPos: number };
    const id = newId();
    this.db
      .prepare('INSERT INTO folders (id, subject_id, name, description, position, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, input.subjectId, input.name.trim(), input.description ?? null, maxPosition.maxPos + 1, nowIso());
    const created = this.get(id);
    if (!created) throw new Error('No se pudo crear el tema.');
    return created;
  }

  update(id: string, input: Partial<FolderInput>): Folder {
    const current = this.get(id);
    if (!current) throw new NotFoundError(`No existe el tema ${id}.`);
    if (input.name !== undefined && input.name.trim().length === 0) {
      throw new ValidationError('El nombre del tema es obligatorio.');
    }
    this.db
      .prepare('UPDATE folders SET name = ?, description = ? WHERE id = ?')
      .run(
        (input.name ?? current.name).trim(),
        input.description !== undefined ? input.description : current.description,
        id,
      );
    const updated = this.get(id);
    if (!updated) throw new Error('No se pudo actualizar el tema.');
    return updated;
  }

  remove(id: string): void {
    const current = this.get(id);
    if (!current) throw new NotFoundError(`No existe el tema ${id}.`);
    this.db.prepare('DELETE FROM folders WHERE id = ?').run(id);
  }
}
