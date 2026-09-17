import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import type { AcademicEvent, AcademicEventType, AgendaRange, EventInput } from '@shared/types';
import { newId, NotFoundError, ValidationError } from '../lib/util.ts';

interface EventRow {
  id: string;
  subject_id: string | null;
  title: string;
  type: AcademicEventType;
  start_at: string;
  end_at: string | null;
  description: string | null;
}

function rowToEvent(row: EventRow): AcademicEvent {
  return {
    id: row.id,
    subjectId: row.subject_id,
    title: row.title,
    type: row.type,
    startAt: row.start_at,
    endAt: row.end_at,
    description: row.description,
  };
}

export class EventsRepository {
  constructor(private readonly db: DatabaseSync) {}

  list(range?: AgendaRange): AcademicEvent[] {
    const clauses: string[] = [];
    const params: SQLInputValue[] = [];
    if (range?.from) {
      clauses.push('start_at >= ?');
      params.push(range.from);
    }
    if (range?.to) {
      clauses.push('start_at <= ?');
      params.push(range.to);
    }
    if (range?.subjectId) {
      clauses.push('subject_id = ?');
      params.push(range.subjectId);
    }
    if (range?.type) {
      clauses.push('type = ?');
      params.push(range.type);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = this.db.prepare(`SELECT * FROM events ${where} ORDER BY start_at ASC`).all(...params) as unknown as EventRow[];
    return rows.map(rowToEvent);
  }

  get(id: string): AcademicEvent | null {
    const row = this.db.prepare('SELECT * FROM events WHERE id = ?').get(id) as unknown as EventRow | undefined;
    return row ? rowToEvent(row) : null;
  }

  create(input: EventInput): AcademicEvent {
    if (input.title.trim().length === 0) throw new ValidationError('El título del evento es obligatorio.');
    const id = newId();
    this.db
      .prepare(
        'INSERT INTO events (id, subject_id, title, type, start_at, end_at, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(id, input.subjectId ?? null, input.title.trim(), input.type, input.startAt, input.endAt ?? null, input.description ?? null);
    const created = this.get(id);
    if (!created) throw new Error('No se pudo crear el evento.');
    return created;
  }

  update(id: string, input: Partial<EventInput>): AcademicEvent {
    const current = this.get(id);
    if (!current) throw new NotFoundError(`No existe el evento ${id}.`);
    this.db
      .prepare('UPDATE events SET title = ?, type = ?, start_at = ?, end_at = ?, description = ? WHERE id = ?')
      .run(
        (input.title ?? current.title).trim(),
        input.type ?? current.type,
        input.startAt ?? current.startAt,
        input.endAt !== undefined ? input.endAt : current.endAt,
        input.description !== undefined ? input.description : current.description,
        id,
      );
    const updated = this.get(id);
    if (!updated) throw new Error('No se pudo actualizar el evento.');
    return updated;
  }

  remove(id: string): void {
    if (!this.get(id)) throw new NotFoundError(`No existe el evento ${id}.`);
    this.db.prepare('DELETE FROM events WHERE id = ?').run(id);
  }
}
