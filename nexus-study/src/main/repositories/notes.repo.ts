import type { DatabaseSync } from 'node:sqlite';
import type { Note, NoteInput } from '@shared/types';
import { newId, nowIso, NotFoundError, ValidationError } from '../lib/util.ts';

interface NoteRow {
  id: string;
  subject_id: string;
  document_id: string | null;
  title: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    subjectId: row.subject_id,
    documentId: row.document_id,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class NotesRepository {
  constructor(private readonly db: DatabaseSync) {}

  listBySubject(subjectId: string): Note[] {
    const rows = this.db
      .prepare('SELECT * FROM notes WHERE subject_id = ? ORDER BY updated_at DESC')
      .all(subjectId) as unknown as NoteRow[];
    return rows.map(rowToNote);
  }

  listByDocument(documentId: string): Note[] {
    const rows = this.db
      .prepare('SELECT * FROM notes WHERE document_id = ? ORDER BY updated_at DESC')
      .all(documentId) as unknown as NoteRow[];
    return rows.map(rowToNote);
  }

  get(id: string): Note | null {
    const row = this.db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as unknown as NoteRow | undefined;
    return row ? rowToNote(row) : null;
  }

  create(input: NoteInput): Note {
    if (input.content.trim().length === 0) throw new ValidationError('La nota no puede estar vacía.');
    const id = newId();
    const now = nowIso();
    this.db
      .prepare(
        'INSERT INTO notes (id, subject_id, document_id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(id, input.subjectId, input.documentId ?? null, input.title ?? null, input.content, now, now);
    const created = this.get(id);
    if (!created) throw new Error('No se pudo crear la nota.');
    return created;
  }

  update(id: string, input: Partial<NoteInput>): Note {
    const current = this.get(id);
    if (!current) throw new NotFoundError(`No existe la nota ${id}.`);
    this.db
      .prepare('UPDATE notes SET title = ?, content = ?, updated_at = ? WHERE id = ?')
      .run(
        input.title !== undefined ? input.title : current.title,
        input.content !== undefined ? input.content : current.content,
        nowIso(),
        id,
      );
    const updated = this.get(id);
    if (!updated) throw new Error('No se pudo actualizar la nota.');
    return updated;
  }

  remove(id: string): void {
    if (!this.get(id)) throw new NotFoundError(`No existe la nota ${id}.`);
    this.db.prepare('DELETE FROM notes WHERE id = ?').run(id);
  }
}
