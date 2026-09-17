import type { DatabaseSync } from 'node:sqlite';
import type { StudySession, StudySessionInput, StudySessionType } from '@shared/types';
import { newId, ValidationError } from '../lib/util.ts';

interface StudySessionRow {
  id: string;
  subject_id: string | null;
  document_id: string | null;
  duration_seconds: number;
  started_at: string;
  ended_at: string;
  type: StudySessionType;
}

function rowToSession(row: StudySessionRow): StudySession {
  return {
    id: row.id,
    subjectId: row.subject_id,
    documentId: row.document_id,
    durationSeconds: row.duration_seconds,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    type: row.type,
  };
}

export class StudySessionsRepository {
  constructor(private readonly db: DatabaseSync) {}

  create(input: StudySessionInput): StudySession {
    if (input.durationSeconds <= 0) {
      throw new ValidationError('La sesión de estudio debe tener una duración mayor que cero.');
    }
    const id = newId();
    this.db
      .prepare(
        `INSERT INTO study_sessions (id, subject_id, document_id, duration_seconds, started_at, ended_at, type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, input.subjectId ?? null, input.documentId ?? null, input.durationSeconds, input.startedAt, input.endedAt, input.type);
    const row = this.db.prepare('SELECT * FROM study_sessions WHERE id = ?').get(id) as unknown as StudySessionRow;
    return rowToSession(row);
  }

  listBySubject(subjectId: string): StudySession[] {
    const rows = this.db
      .prepare('SELECT * FROM study_sessions WHERE subject_id = ? ORDER BY started_at DESC')
      .all(subjectId) as unknown as StudySessionRow[];
    return rows.map(rowToSession);
  }
}
