import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import type { StudyTask, TaskFilters, TaskInput, TaskPriority } from '@shared/types';
import { newId, nowIso, NotFoundError, ValidationError } from '../lib/util.ts';

interface TaskRow {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'completed';
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
}

function rowToTask(row: TaskRow): StudyTask {
  return {
    id: row.id,
    subjectId: row.subject_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

const UPCOMING_WINDOW_DAYS = 7;

export class TasksRepository {
  constructor(private readonly db: DatabaseSync) {}

  private buildWhere(filters: TaskFilters | undefined): { clause: string; params: SQLInputValue[] } {
    const clauses: string[] = [];
    const params: SQLInputValue[] = [];
    if (filters?.subjectId) {
      clauses.push('subject_id = ?');
      params.push(filters.subjectId);
    }
    const now = nowIso();
    switch (filters?.status) {
      case 'pending':
        clauses.push("status = 'pending'");
        break;
      case 'completed':
        clauses.push("status = 'completed'");
        break;
      case 'overdue':
        clauses.push("status = 'pending' AND due_date IS NOT NULL AND due_date < ?");
        params.push(now);
        break;
      case 'upcoming': {
        const limit = new Date(Date.now() + UPCOMING_WINDOW_DAYS * 86_400_000).toISOString();
        clauses.push("status = 'pending' AND due_date IS NOT NULL AND due_date >= ? AND due_date <= ?");
        params.push(now, limit);
        break;
      }
      case 'all':
      default:
        break;
    }
    return { clause: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
  }

  listBySubject(subjectId: string, filters?: TaskFilters): StudyTask[] {
    const { clause, params } = this.buildWhere({ ...filters, subjectId });
    const rows = this.db
      .prepare(`SELECT * FROM tasks ${clause} ORDER BY (due_date IS NULL), due_date ASC, created_at DESC`)
      .all(...params) as unknown as TaskRow[];
    return rows.map(rowToTask);
  }

  listAll(filters?: TaskFilters): StudyTask[] {
    const { clause, params } = this.buildWhere(filters);
    const rows = this.db
      .prepare(`SELECT * FROM tasks ${clause} ORDER BY (due_date IS NULL), due_date ASC, created_at DESC`)
      .all(...params) as unknown as TaskRow[];
    return rows.map(rowToTask);
  }

  get(id: string): StudyTask | null {
    const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as unknown as TaskRow | undefined;
    return row ? rowToTask(row) : null;
  }

  create(input: TaskInput): StudyTask {
    if (input.title.trim().length === 0) throw new ValidationError('El título de la tarea es obligatorio.');
    const id = newId();
    this.db
      .prepare(
        `INSERT INTO tasks (id, subject_id, title, description, status, priority, due_date, created_at, completed_at)
         VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, NULL)`,
      )
      .run(
        id,
        input.subjectId,
        input.title.trim(),
        input.description ?? null,
        input.priority ?? 'medium',
        input.dueDate ?? null,
        nowIso(),
      );
    const created = this.get(id);
    if (!created) throw new Error('No se pudo crear la tarea.');
    return created;
  }

  update(id: string, input: Partial<TaskInput>): StudyTask {
    const current = this.get(id);
    if (!current) throw new NotFoundError(`No existe la tarea ${id}.`);
    if (input.title !== undefined && input.title.trim().length === 0) {
      throw new ValidationError('El título de la tarea es obligatorio.');
    }
    this.db
      .prepare('UPDATE tasks SET title = ?, description = ?, priority = ?, due_date = ? WHERE id = ?')
      .run(
        (input.title ?? current.title).trim(),
        input.description !== undefined ? input.description : current.description,
        input.priority ?? current.priority,
        input.dueDate !== undefined ? input.dueDate : current.dueDate,
        id,
      );
    const updated = this.get(id);
    if (!updated) throw new Error('No se pudo actualizar la tarea.');
    return updated;
  }

  setCompleted(id: string, completed: boolean): StudyTask {
    const current = this.get(id);
    if (!current) throw new NotFoundError(`No existe la tarea ${id}.`);
    this.db
      .prepare("UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?")
      .run(completed ? 'completed' : 'pending', completed ? nowIso() : null, id);
    const updated = this.get(id);
    if (!updated) throw new Error('No se pudo actualizar la tarea.');
    return updated;
  }

  remove(id: string): void {
    if (!this.get(id)) throw new NotFoundError(`No existe la tarea ${id}.`);
    this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  }
}
