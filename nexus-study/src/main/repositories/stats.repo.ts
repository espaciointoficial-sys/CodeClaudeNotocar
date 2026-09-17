import type { DatabaseSync } from 'node:sqlite';
import type { MostOpenedDocument, StatsPeriod, StatsSummary, StudyTimeByDay, StudyTimeBySubject } from '@shared/types';

function periodBounds(period: StatsPeriod): { from: string | null; bucketDays: number } {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'week') {
    const from = new Date(startOfToday);
    from.setDate(from.getDate() - 6);
    return { from: from.toISOString(), bucketDays: 7 };
  }
  if (period === 'month') {
    const from = new Date(startOfToday);
    from.setDate(from.getDate() - 29);
    return { from: from.toISOString(), bucketDays: 30 };
  }
  return { from: null, bucketDays: 30 };
}

/** Clave de día en la zona horaria local (no UTC), para que "hoy" e "hilera de días" coincidan con el calendario del usuario. */
function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export class StatsRepository {
  constructor(private readonly db: DatabaseSync) {}

  summary(period: StatsPeriod): StatsSummary {
    const { from, bucketDays } = periodBounds(period);
    const sessionRows = this.db
      .prepare(
        from
          ? 'SELECT * FROM study_sessions WHERE started_at >= ? ORDER BY started_at ASC'
          : 'SELECT * FROM study_sessions ORDER BY started_at ASC',
      )
      .all(...(from ? [from] : [])) as {
      subject_id: string | null;
      duration_seconds: number;
      started_at: string;
    }[];

    const totalStudySeconds = sessionRows.reduce((sum, row) => sum + row.duration_seconds, 0);

    // Serie por día (últimos `bucketDays` días respecto a hoy, o el rango completo si es más corto).
    const byDayMap = new Map<string, number>();
    const today = new Date();
    const chartDays = period === 'all' ? Math.min(bucketDays, 30) : bucketDays;
    for (let i = chartDays - 1; i >= 0; i -= 1) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      byDayMap.set(localDayKey(d), 0);
    }
    for (const row of sessionRows) {
      const key = localDayKey(new Date(row.started_at));
      if (byDayMap.has(key)) {
        byDayMap.set(key, (byDayMap.get(key) ?? 0) + row.duration_seconds);
      }
    }
    const studyTimeByDay: StudyTimeByDay[] = Array.from(byDayMap.entries()).map(([date, seconds]) => ({
      date,
      seconds,
    }));

    // Tiempo por asignatura.
    const bySubjectRows = this.db
      .prepare(
        `SELECT s.id AS subject_id, s.name AS subject_name, s.color AS subject_color, COALESCE(SUM(ss.duration_seconds), 0) AS seconds
         FROM subjects s
         LEFT JOIN study_sessions ss ON ss.subject_id = s.id ${from ? 'AND ss.started_at >= ?' : ''}
         GROUP BY s.id
         HAVING seconds > 0
         ORDER BY seconds DESC`,
      )
      .all(...(from ? [from] : [])) as { subject_id: string; subject_name: string; subject_color: string; seconds: number }[];
    const studyTimeBySubject: StudyTimeBySubject[] = bySubjectRows.map((row) => ({
      subjectId: row.subject_id,
      subjectName: row.subject_name,
      subjectColor: row.subject_color,
      seconds: row.seconds,
    }));

    // Tareas.
    const taskWhere = from ? 'WHERE created_at >= ?' : '';
    const taskTotal = this.db.prepare(`SELECT COUNT(*) AS c FROM tasks ${taskWhere}`).get(...(from ? [from] : [])) as {
      c: number;
    };
    const taskCompletedWhere = from ? "WHERE status = 'completed' AND completed_at >= ?" : "WHERE status = 'completed'";
    const taskCompleted = this.db
      .prepare(`SELECT COUNT(*) AS c FROM tasks ${taskCompletedWhere}`)
      .get(...(from ? [from] : [])) as { c: number };

    // Documentos más consultados (acumulado histórico).
    const mostOpenedRows = this.db
      .prepare(
        `SELECT d.id AS document_id, d.title AS title, s.name AS subject_name, d.open_count AS open_count
         FROM documents d JOIN subjects s ON s.id = d.subject_id
         WHERE d.open_count > 0
         ORDER BY d.open_count DESC
         LIMIT 5`,
      )
      .all() as { document_id: string; title: string; subject_name: string; open_count: number }[];
    const mostOpenedDocuments: MostOpenedDocument[] = mostOpenedRows.map((row) => ({
      documentId: row.document_id,
      title: row.title,
      subjectName: row.subject_name,
      openCount: row.open_count,
    }));

    return {
      totalStudySeconds,
      studyTimeByDay,
      studyTimeBySubject,
      tasksCompleted: taskCompleted.c,
      tasksTotal: taskTotal.c,
      mostOpenedDocuments,
      currentStreakDays: this.computeStreak(),
    };
  }

  private computeStreak(): number {
    const rows = this.db.prepare('SELECT started_at FROM study_sessions').all() as { started_at: string }[];
    if (rows.length === 0) return 0;

    const days = new Set(rows.map((r) => localDayKey(new Date(r.started_at))));
    const cursor = new Date();
    let streak = 0;

    if (!days.has(localDayKey(cursor))) {
      // Si hoy todavía no se ha estudiado, la racha se cuenta desde ayer para no romperla prematuramente.
      cursor.setDate(cursor.getDate() - 1);
      if (!days.has(localDayKey(cursor))) return 0;
    }

    while (days.has(localDayKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }
}
