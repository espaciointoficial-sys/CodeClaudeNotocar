import { useEffect, useState } from 'react';
import type { DocumentItem, StudySession, StudyTask } from '@shared/types';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDateTime, formatDuration } from '../../lib/format';
import styles from './ProgressTab.module.css';

const SESSION_TYPE_LABEL = { pomodoro: 'Pomodoro', free_reading: 'Lectura libre', review: 'Repaso', other: 'Otro' } as const;

export function ProgressTab({ subjectId }: { subjectId: string }) {
  const [sessions, setSessions] = useState<StudySession[] | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[] | null>(null);
  const [tasks, setTasks] = useState<StudyTask[] | null>(null);

  useEffect(() => {
    window.api.studySessions.listBySubject(subjectId).then(setSessions);
    window.api.documents.listBySubject(subjectId).then(setDocuments);
    window.api.tasks.listBySubject(subjectId, { status: 'all' }).then(setTasks);
  }, [subjectId]);

  if (!sessions || !documents || !tasks) return null;

  const totalSeconds = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const consultedDocs = documents.filter((d) => d.openCount > 0).length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;

  if (sessions.length === 0 && documents.length === 0 && tasks.length === 0) {
    return (
      <EmptyState
        icon="bar-chart"
        title="Todavía no hay actividad en esta asignatura"
        description="A medida que estudies, importes apuntes y completes tareas, verás tu progreso aquí."
      />
    );
  }

  return (
    <div>
      <div className={styles.tiles}>
        <div className={styles.tile}>
          <span className={styles.value}>{formatDuration(totalSeconds)}</span>
          <span className={styles.label}>Tiempo de estudio</span>
        </div>
        <div className={styles.tile}>
          <span className={styles.value}>
            {consultedDocs}/{documents.length}
          </span>
          <span className={styles.label}>Apuntes consultados</span>
        </div>
        <div className={styles.tile}>
          <span className={styles.value}>
            {completedTasks}/{tasks.length}
          </span>
          <span className={styles.label}>Tareas completadas</span>
        </div>
      </div>

      <h3 className={styles.subheading}>Actividad reciente</h3>
      {sessions.length === 0 ? (
        <EmptyState icon="clock" title="Sin sesiones de estudio registradas todavía" />
      ) : (
        <div className={styles.list}>
          {sessions.slice(0, 12).map((session) => (
            <div key={session.id} className={styles.sessionRow}>
              <span>{SESSION_TYPE_LABEL[session.type]}</span>
              <span>{formatDuration(session.durationSeconds)}</span>
              <span className={styles.date}>{formatDateTime(session.startedAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
