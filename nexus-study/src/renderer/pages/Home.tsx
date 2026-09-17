import { useEffect, useState } from 'react';
import type { HomeSummary } from '@shared/types';
import type { View } from '../App';
import { usePomodoro } from '../contexts/PomodoroContext';
import { useToast } from '../contexts/ToastContext';
import { useViewer } from '../contexts/ViewerContext';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { formatDuration, formatRelativeDay } from '../lib/format';
import styles from './Home.module.css';

const GREETINGS = ['Buenos días', 'Buenas tardes', 'Buenas noches'];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return GREETINGS[0]!;
  if (hour < 20) return GREETINGS[1]!;
  return GREETINGS[2]!;
}

const today = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

export function Home({ onNavigate }: { onNavigate: (view: View) => void }) {
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const pomodoro = usePomodoro();
  const { showToast } = useToast();
  const { openViewer } = useViewer();

  useEffect(() => {
    window.api.home.summary().then(setSummary);
  }, []);

  if (!summary) return <Spinner label="Cargando tu resumen…" />;

  const goToSubjectPicker = (hint: string) => {
    showToast(hint, 'info');
    onNavigate({ name: 'subjects' });
  };

  const weeklyPercent = Math.min(100, Math.round((summary.weeklyStudySeconds / summary.weeklyGoalSeconds) * 100));

  return (
    <div>
      <div className={styles.header}>
        <div>
          <p className={styles.date}>{today.charAt(0).toUpperCase() + today.slice(1)}</p>
          <h1>
            {greeting()}. Esto es lo que tienes por delante
          </h1>
        </div>
      </div>

      <div className="page-body">
        <div className={styles.quickActions}>
          <Button variant="primary" onClick={() => onNavigate({ name: 'subjects', openCreateToken: Date.now() })}>
            + Nueva asignatura
          </Button>
          <Button onClick={() => goToSubjectPicker('Elige una asignatura para importar un apunte.')}>
            Subir apunte
          </Button>
          <Button onClick={() => goToSubjectPicker('Elige una asignatura para crear una tarea.')}>Crear tarea</Button>
          <Button onClick={() => (pomodoro.status === 'running' ? pomodoro.pause() : pomodoro.start())}>
            {pomodoro.status === 'running' ? 'Pausar Pomodoro' : 'Iniciar Pomodoro'}
          </Button>
        </div>

        <div className={styles.primaryGrid}>
          <section className={styles.card}>
            <h2>Tareas pendientes</h2>
            {summary.pendingTasks.length === 0 ? (
              <EmptyState icon="check-circle" title="Sin tareas pendientes" description="Cuando crees tareas en tus asignaturas aparecerán aquí." />
            ) : (
              <ul className={styles.list}>
                {summary.pendingTasks.map((task) => (
                  <li key={task.id} className={styles.listItem}>
                    <span>{task.title}</span>
                    {task.dueDate ? <Badge tone="warning">{formatRelativeDay(task.dueDate)}</Badge> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.card}>
            <h2>Próximos exámenes y entregas</h2>
            {summary.upcomingEvents.length === 0 ? (
              <EmptyState icon="calendar" title="No hay eventos próximos" description="Añade exámenes o entregas desde la Agenda o una asignatura." />
            ) : (
              <ul className={styles.list}>
                {summary.upcomingEvents.map((event) => (
                  <li key={event.id} className={styles.listItem}>
                    <span>{event.title}</span>
                    <Badge tone="accent">{formatRelativeDay(event.startAt)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className={`${styles.card} ${styles.cardSecondary}`}>
          <div className={styles.secondaryGrid}>
            <div>
              <h3>Asignaturas recientes</h3>
              {summary.recentSubjects.length === 0 ? (
                <EmptyState compact icon="book" title="Aún no has abierto ninguna asignatura" />
              ) : (
                <ul className={styles.list}>
                  {summary.recentSubjects.map((subject) => (
                    <li key={subject.id} className={styles.listItem}>
                      <button
                        className={styles.linkItem}
                        onClick={() => onNavigate({ name: 'subjectDetail', subjectId: subject.id })}
                      >
                        <span className={styles.dot} style={{ background: subject.color }} />
                        {subject.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3>Apuntes recientes</h3>
              {summary.recentDocuments.length === 0 ? (
                <EmptyState compact icon="file-text" title="Todavía no has abierto ningún apunte" />
              ) : (
                <ul className={styles.list}>
                  {summary.recentDocuments.map((doc) => (
                    <li key={doc.id} className={styles.listItem}>
                      <button
                        className={styles.linkItem}
                        onClick={() => {
                          void window.api.documents.registerOpen(doc.id);
                          openViewer(doc.id);
                        }}
                      >
                        <Icon name="file-text" size={14} />
                        {doc.title}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section className={styles.progressStrip}>
          <div className={styles.progressStripHead}>
            <span>Progreso semanal de estudio</span>
            <span className={styles.progressValue}>{formatDuration(summary.weeklyStudySeconds)}</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${weeklyPercent}%` }} />
          </div>
          <p className={styles.progressHint}>
            Objetivo orientativo: {formatDuration(summary.weeklyGoalSeconds)} a la semana ({weeklyPercent}%)
          </p>
        </section>
      </div>
    </div>
  );
}
