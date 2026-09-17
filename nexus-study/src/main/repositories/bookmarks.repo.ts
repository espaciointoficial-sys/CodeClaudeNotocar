import type { DatabaseSync } from 'node:sqlite';
import type { Bookmark, BookmarkInput } from '@shared/types';
import { newId, nowIso, NotFoundError, ValidationError } from '../lib/util.ts';

interface BookmarkRow {
  id: string;
  document_id: string;
  page: number;
  label: string | null;
  note: string | null;
  created_at: string;
}

function rowToBookmark(row: BookmarkRow): Bookmark {
  return {
    id: row.id,
    documentId: row.document_id,
    page: row.page,
    label: row.label,
    note: row.note,
    createdAt: row.created_at,
  };
}

export class BookmarksRepository {
  constructor(private readonly db: DatabaseSync) {}

  listByDocument(documentId: string): Bookmark[] {
    const rows = this.db
      .prepare('SELECT * FROM bookmarks WHERE document_id = ? ORDER BY page ASC')
      .all(documentId) as unknown as BookmarkRow[];
    return rows.map(rowToBookmark);
  }

  get(id: string): Bookmark | null {
    const row = this.db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(id) as unknown as BookmarkRow | undefined;
    return row ? rowToBookmark(row) : null;
  }

  create(input: BookmarkInput): Bookmark {
    if (input.page < 1) throw new ValidationError('El número de página debe ser mayor que cero.');
    const id = newId();
    this.db
      .prepare('INSERT INTO bookmarks (id, document_id, page, label, note, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, input.documentId, input.page, input.label ?? null, input.note ?? null, nowIso());
    const created = this.get(id);
    if (!created) throw new Error('No se pudo crear el marcador.');
    return created;
  }

  update(id: string, input: Partial<BookmarkInput>): Bookmark {
    const current = this.get(id);
    if (!current) throw new NotFoundError(`No existe el marcador ${id}.`);
    this.db
      .prepare('UPDATE bookmarks SET page = ?, label = ?, note = ? WHERE id = ?')
      .run(
        input.page ?? current.page,
        input.label !== undefined ? input.label : current.label,
        input.note !== undefined ? input.note : current.note,
        id,
      );
    const updated = this.get(id);
    if (!updated) throw new Error('No se pudo actualizar el marcador.');
    return updated;
  }

  remove(id: string): void {
    if (!this.get(id)) throw new NotFoundError(`No existe el marcador ${id}.`);
    this.db.prepare('DELETE FROM bookmarks WHERE id = ?').run(id);
  }
}
