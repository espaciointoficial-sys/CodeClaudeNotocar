import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import type {
  DocumentFileType,
  DocumentFilters,
  DocumentItem,
  DocumentUpdateInput,
  LibraryFilters,
} from '@shared/types';
import { newId, nowIso, NotFoundError, ValidationError } from '../lib/util.ts';

interface DocumentRow {
  id: string;
  subject_id: string;
  folder_id: string | null;
  title: string;
  original_name: string;
  internal_path: string;
  file_type: string;
  size_bytes: number;
  page_count: number | null;
  tags: string;
  description: string | null;
  is_favorite: number;
  imported_at: string;
  last_opened_at: string | null;
  last_studied_at: string | null;
  open_count: number;
  last_page: number;
}

function rowToDocument(row: DocumentRow): DocumentItem {
  let tags: string[];
  try {
    tags = JSON.parse(row.tags);
  } catch {
    tags = [];
  }
  return {
    id: row.id,
    subjectId: row.subject_id,
    folderId: row.folder_id,
    title: row.title,
    originalName: row.original_name,
    internalPath: row.internal_path,
    fileType: row.file_type as DocumentFileType,
    sizeBytes: row.size_bytes,
    pageCount: row.page_count,
    tags,
    description: row.description,
    isFavorite: row.is_favorite === 1,
    importedAt: row.imported_at,
    lastOpenedAt: row.last_opened_at,
    lastStudiedAt: row.last_studied_at,
    openCount: row.open_count,
    lastPage: row.last_page,
  };
}

export interface CreateDocumentRecord {
  subjectId: string;
  folderId?: string | null;
  title: string;
  originalName: string;
  internalPath: string;
  fileType: DocumentFileType;
  sizeBytes: number;
  pageCount: number | null;
  tags?: string[];
  description?: string | null;
  /** Texto extraído del PDF para poder buscar dentro del contenido. Nunca se envía al renderer. */
  contentText?: string | null;
}

// Columnas explícitas (sin content_text): esa columna puede pesar hasta ~2 MB por documento y
// solo se usa dentro del propio WHERE de SQLite; nunca debe viajar al renderer por IPC.
const DOCUMENT_COLUMNS = `
  d.id, d.subject_id, d.folder_id, d.title, d.original_name, d.internal_path, d.file_type,
  d.size_bytes, d.page_count, d.tags, d.description, d.is_favorite, d.imported_at,
  d.last_opened_at, d.last_studied_at, d.open_count, d.last_page
`;

export class DocumentsRepository {
  constructor(private readonly db: DatabaseSync) {}

  private buildWhere(filters: DocumentFilters | LibraryFilters | undefined): { clause: string; params: SQLInputValue[] } {
    const clauses: string[] = [];
    const params: SQLInputValue[] = [];
    if (filters?.subjectId) {
      clauses.push('d.subject_id = ?');
      params.push(filters.subjectId);
    }
    if (filters?.folderId !== undefined) {
      if (filters.folderId === null) clauses.push('d.folder_id IS NULL');
      else {
        clauses.push('d.folder_id = ?');
        params.push(filters.folderId);
      }
    }
    if (filters?.fileType) {
      clauses.push('d.file_type = ?');
      params.push(filters.fileType);
    }
    if (filters?.favoritesOnly) {
      clauses.push('d.is_favorite = 1');
    }
    if (filters?.search) {
      clauses.push('(d.title LIKE ? OR d.original_name LIKE ? OR d.tags LIKE ? OR d.content_text LIKE ?)');
      const like = `%${filters.search}%`;
      params.push(like, like, like, like);
    }
    return { clause: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
  }

  private orderClause(sortBy: DocumentFilters['sortBy'] | LibraryFilters['sortBy']): string {
    switch (sortBy) {
      case 'name':
        return 'ORDER BY d.title COLLATE NOCASE ASC';
      case 'lastOpenedAt':
        return 'ORDER BY d.last_opened_at IS NULL, d.last_opened_at DESC';
      case 'favorite':
        return 'ORDER BY d.is_favorite DESC, d.imported_at DESC';
      case 'importedAt':
      default:
        return 'ORDER BY d.imported_at DESC';
    }
  }

  listBySubject(subjectId: string, filters?: DocumentFilters): DocumentItem[] {
    const { clause, params } = this.buildWhere({ ...filters, subjectId });
    const order = this.orderClause(filters?.sortBy);
    const rows = this.db
      .prepare(`SELECT ${DOCUMENT_COLUMNS} FROM documents d ${clause} ${order}`)
      .all(...params) as unknown as DocumentRow[];
    return rows.map(rowToDocument);
  }

  listLibrary(filters?: LibraryFilters): DocumentItem[] {
    const { clause, params } = this.buildWhere(filters);
    const order = this.orderClause(filters?.sortBy);
    const rows = this.db
      .prepare(`SELECT ${DOCUMENT_COLUMNS} FROM documents d ${clause} ${order}`)
      .all(...params) as unknown as DocumentRow[];
    return rows.map(rowToDocument);
  }

  get(id: string): DocumentItem | null {
    const row = this.db
      .prepare(`SELECT ${DOCUMENT_COLUMNS} FROM documents d WHERE d.id = ?`)
      .get(id) as unknown as DocumentRow | undefined;
    return row ? rowToDocument(row) : null;
  }

  private requireExists(id: string): DocumentItem {
    const doc = this.get(id);
    if (!doc) throw new NotFoundError(`No existe el documento ${id}.`);
    return doc;
  }

  create(record: CreateDocumentRecord): DocumentItem {
    if (record.title.trim().length === 0) throw new ValidationError('El título del apunte es obligatorio.');
    const id = newId();
    this.db
      .prepare(
        `INSERT INTO documents (
          id, subject_id, folder_id, title, original_name, internal_path, file_type, size_bytes,
          page_count, tags, description, is_favorite, imported_at, last_opened_at, last_studied_at,
          open_count, last_page, content_text
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NULL, NULL, 0, 1, ?)`,
      )
      .run(
        id,
        record.subjectId,
        record.folderId ?? null,
        record.title.trim(),
        record.originalName,
        record.internalPath,
        record.fileType,
        record.sizeBytes,
        record.pageCount,
        JSON.stringify(record.tags ?? []),
        record.description ?? null,
        nowIso(),
        record.contentText ?? null,
      );
    return this.requireExists(id);
  }

  update(id: string, input: DocumentUpdateInput): DocumentItem {
    const current = this.requireExists(id);
    if (input.title !== undefined && input.title.trim().length === 0) {
      throw new ValidationError('El título del apunte es obligatorio.');
    }
    this.db
      .prepare('UPDATE documents SET title = ?, folder_id = ?, description = ?, tags = ?, is_favorite = ? WHERE id = ?')
      .run(
        (input.title ?? current.title).trim(),
        input.folderId !== undefined ? input.folderId : current.folderId,
        input.description !== undefined ? input.description : current.description,
        JSON.stringify(input.tags ?? current.tags),
        (input.isFavorite ?? current.isFavorite) ? 1 : 0,
        id,
      );
    return this.requireExists(id);
  }

  move(id: string, folderId: string | null): DocumentItem {
    this.requireExists(id);
    this.db.prepare('UPDATE documents SET folder_id = ? WHERE id = ?').run(folderId, id);
    return this.requireExists(id);
  }

  remove(id: string): DocumentItem {
    const current = this.requireExists(id);
    this.db.prepare('DELETE FROM documents WHERE id = ?').run(id);
    return current;
  }

  registerOpen(id: string): DocumentItem {
    this.requireExists(id);
    const now = nowIso();
    this.db
      .prepare('UPDATE documents SET last_opened_at = ?, open_count = open_count + 1 WHERE id = ?')
      .run(now, id);
    return this.requireExists(id);
  }

  registerStudy(id: string): void {
    this.requireExists(id);
    this.db.prepare('UPDATE documents SET last_studied_at = ? WHERE id = ?').run(nowIso(), id);
  }

  setLastPage(id: string, page: number): void {
    this.requireExists(id);
    this.db.prepare('UPDATE documents SET last_page = ? WHERE id = ?').run(Math.max(1, page), id);
  }
}
