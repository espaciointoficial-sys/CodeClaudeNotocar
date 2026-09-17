import type { DatabaseSync } from 'node:sqlite';
import type { Subject, SubjectInput, SubjectWithStats } from '@shared/types';
import { newId, nowIso, NotFoundError, ValidationError } from '../lib/util.ts';

interface SubjectRow {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  professor: string | null;
  term: string | null;
  description: string | null;
  status: 'active' | 'archived';
  position: number;
  created_at: string;
  updated_at: string;
  last_accessed_at: string | null;
}

function rowToSubject(row: SubjectRow): Subject {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    professor: row.professor,
    term: row.term,
    description: row.description,
    status: row.status,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastAccessedAt: row.last_accessed_at,
  };
}

function validate(input: Partial<SubjectInput>): void {
  if (input.name !== undefined && input.name.trim().length === 0) {
    throw new ValidationError('El nombre de la asignatura es obligatorio.');
  }
  if (input.color !== undefined && !/^#[0-9a-fA-F]{6}$/.test(input.color)) {
    throw new ValidationError('El color debe ser un valor hexadecimal válido, por ejemplo #4F46E5.');
  }
}

export class SubjectsRepository {
  constructor(private readonly db: DatabaseSync) {}

  listWithStats(includeArchived: boolean): SubjectWithStats[] {
    const statusClause = includeArchived ? '' : "WHERE s.status = 'active'";
    const rows = this.db
      .prepare(
        `
      SELECT
        s.*,
        (SELECT COUNT(*) FROM documents d WHERE d.subject_id = s.id) AS document_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.subject_id = s.id AND t.status = 'pending') AS pending_task_count,
        (SELECT e.start_at FROM events e WHERE e.subject_id = s.id AND e.start_at >= ? ORDER BY e.start_at ASC LIMIT 1) AS next_event_at,
        (SELECT e.title FROM events e WHERE e.subject_id = s.id AND e.start_at >= ? ORDER BY e.start_at ASC LIMIT 1) AS next_event_title
      FROM subjects s
      ${statusClause}
      ORDER BY s.position ASC, s.created_at ASC
    `,
      )
      .all(nowIso(), nowIso()) as unknown as (SubjectRow & {
      document_count: number;
      pending_task_count: number;
      next_event_at: string | null;
      next_event_title: string | null;
    })[];

    return rows.map((row) => ({
      ...rowToSubject(row),
      documentCount: row.document_count,
      pendingTaskCount: row.pending_task_count,
      nextEventAt: row.next_event_at,
      nextEventTitle: row.next_event_title,
    }));
  }

  get(id: string): Subject | null {
    const row = this.db.prepare('SELECT * FROM subjects WHERE id = ?').get(id) as unknown as SubjectRow | undefined;
    return row ? rowToSubject(row) : null;
  }

  private requireExists(id: string): void {
    const exists = this.db.prepare('SELECT 1 FROM subjects WHERE id = ?').get(id);
    if (!exists) throw new NotFoundError(`No existe la asignatura ${id}.`);
  }

  create(input: SubjectInput): Subject {
    validate(input);
    const maxPosition = this.db.prepare('SELECT COALESCE(MAX(position), -1) AS maxPos FROM subjects').get() as {
      maxPos: number;
    };
    const id = newId();
    const now = nowIso();
    this.db
      .prepare(
        `INSERT INTO subjects (id, name, color, icon, professor, term, description, status, position, created_at, updated_at, last_accessed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, NULL)`,
      )
      .run(
        id,
        input.name.trim(),
        input.color,
        input.icon ?? null,
        input.professor ?? null,
        input.term ?? null,
        input.description ?? null,
        maxPosition.maxPos + 1,
        now,
        now,
      );
    const created = this.get(id);
    if (!created) throw new Error('No se pudo crear la asignatura.');
    return created;
  }

  update(id: string, input: Partial<SubjectInput>): Subject {
    this.requireExists(id);
    validate(input);
    const current = this.get(id);
    if (!current) throw new NotFoundError(`No existe la asignatura ${id}.`);

    this.db
      .prepare(
        `UPDATE subjects SET name = ?, color = ?, icon = ?, professor = ?, term = ?, description = ?, updated_at = ? WHERE id = ?`,
      )
      .run(
        (input.name ?? current.name).trim(),
        input.color ?? current.color,
        input.icon !== undefined ? input.icon : current.icon,
        input.professor !== undefined ? input.professor : current.professor,
        input.term !== undefined ? input.term : current.term,
        input.description !== undefined ? input.description : current.description,
        nowIso(),
        id,
      );
    const updated = this.get(id);
    if (!updated) throw new Error('No se pudo actualizar la asignatura.');
    return updated;
  }

  setArchived(id: string, archived: boolean): Subject {
    this.requireExists(id);
    this.db
      .prepare('UPDATE subjects SET status = ?, updated_at = ? WHERE id = ?')
      .run(archived ? 'archived' : 'active', nowIso(), id);
    const updated = this.get(id);
    if (!updated) throw new Error('No se pudo archivar la asignatura.');
    return updated;
  }

  reorder(orderedIds: string[]): void {
    const update = this.db.prepare('UPDATE subjects SET position = ? WHERE id = ?');
    orderedIds.forEach((id, index) => update.run(index, id));
  }

  remove(id: string): void {
    this.requireExists(id);
    this.db.prepare('DELETE FROM subjects WHERE id = ?').run(id);
  }

  touchAccessed(id: string): void {
    this.db.prepare('UPDATE subjects SET last_accessed_at = ? WHERE id = ?').run(nowIso(), id);
  }
}
