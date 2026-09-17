import { useEffect, useMemo, useState } from 'react';
import type { HomeSummary, StatsSummary, SubjectWithStats } from '@shared/types';
import type { View } from '../App';
import { useToast } from '../contexts/ToastContext';
import { useViewer } from '../contexts/ViewerContext';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { Icon } from '../components/ui/Icon';
import { TaskListItem } from '../components/tasks/TaskListItem';
import { EventListItem } from '../components/calendar/EventListItem';
import { agendaBucketFor, AGENDA_BUCKET_LABEL, formatDuration, formatRelativeDay, pluralize, type AgendaBucket } from '../lib/format';
import styles from './Home.module.css';

const GREETINGS = ['Buenos días', 'Buenas tardes', 'Buenas noches'];
const BUCKET_ORDER: AgendaBucket[] = ['overdue', 'today', 'week', 'later'];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return GREETINGS[0]!;
  if (hour < 20) return GREETINGS[1]!;
  return GREETINGS[2]!;
}

const today = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

export function Home({ onNavigate }: { onNavigate: (view: View) => void }) {
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [subjects, setSubjects] = useState<SubjectWithStats[]>([]);
  const [weekStats, setWeekStats] = useState<StatsSummary | null>(null);
  const { showToast } = useToast();
  const { openViewer } = useViewer();

  useEffect(() => {
    window.api.home.summary().then(setSummary);
    window.api.subjects.list(false).then(setSubjects);
    window.api.stats.summary('week').then(setWeekStats);
  }, []);

  const subjectById = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);

  const tasksByBucket = useMemo(() => {
    const map = new Map<AgendaBucket, HomeSummary['pendingTasks']>();
    for (const bucket of BUCKET_ORDER) map.set(bucket, []);
    const noDate: HomeSummary['pendingTasks'] = [];
    summary?.pendingTasks.forEach((task) => {
      if (task.dueDate) map.get(agendaBucketFor(task.dueDate))?.push(task);
      else noDate.push(task);
    });
    return { map, noDate };
  }, [summary]);

  const eventsByBucket = useMemo(() => {
    const map = new Map<AgendaBucket, HomeSummary['upcomingEvents']>();
    for (const bucket of BUCKET_ORDER) map.set(bucket, []);
    summary?.upcomingEvents.forEach((event) => map.get(agendaBucketFor(event.startAt))?.push(event));
    return map;
  }, [summary]);

  if (!summary) return <Spinner label="Cargando tu resumen…" />;

  const goToSubjectPicker = (hint: string) => {
    showToast(hint, 'info');
    onNavigate({ name: 'subjects' });
  };

  const handleCompleteTask = (taskId: string) => {
    void window.api.tasks.setCompleted(taskId, true).then(() => {
      window.api.home.summary().then(setSummary);
    });
  };

  const weeklyPercent = Math.min(100, Math.round((summary.weeklyStudySeconds / summary.weeklyGoalSeconds) * 100));
  const daysActive = weekStats ? weekStats.studyTimeByDay.filter((d) => d.seconds > 0).length : 0;

  const continueDoc = summary.recentDocuments[0];
  const continueSubject = continueDoc ? subjectById.get(continueDoc.subjectId) : undefined;
  const fallbackSubject = summary.recentSubjects[0];

  const contextMessage =
    summary.pendingTasks.length > 0
      ? `Tienes ${summary.pendingTasks.length} ${pluralize(summary.pendingTasks.length, 'tarea pendiente', 'tareas pendientes')}.`
      : summary.weeklyStudySeconds > 0
        ? `Has estudiado ${formatDuration(summary.weeklyStudySeconds)} esta semana. Buen ritmo.`
        : 'Todo tranquilo por ahora. Buen momento para avanzar.';

  const isEmptyAgenda = tasksByBucket.noDate.length === 0 && BUCKET_ORDER.every((b) => tasksByBucket.map.get(b)!.length === 0 && eventsByBucket.get(b)!.length === 0);

  return (
    <div>
      <div className={styles.hero}>
        <p className={styles.date}>{today.charAt(0).toUpperCase() + today.slice(1)}</p>
        <h1>{greeting()}</h1>
        <p className={styles.contextMessage}>{contextMessage}</p>
        {continueDoc && (
          <p className={styles.continueCaption}>
            {continueDoc.title}
            {continueSubject ? ` · ${continueSubject.name}` : ''}
            {continueDoc.lastPage > 1 ? ` · pág. ${continueDoc.lastPage}` : ''}
          </p>
        )}

        <div className={styles.heroActions}>
          {continueDoc ? (
            <Button
              variant="primary"
              onClick={() => {
                void window.api.documents.registerOpen(continueDoc.id);
                openViewer(continueDoc.id);
              }}
            >
              <Icon name="play" size={15} filled />
              Continuar estudiando
            </Button>
          ) : fallbackSubject ? (
            <Button variant="primary" onClick={() => onNavigate({ name: 'subjectDetail', subjectId: fallbackSubject.id })}>
              <Icon name="play" size={15} filled />
              Continuar con {fallbackSubject.name}
            </Button>
          ) : (
            <Button variant="primary" onClick={() => goToSubjectPicker('Elige una asignatura para subir tu primer apunte.')}>
              <Icon name="paperclip" size={15} />
              Subir primer apunte
            </Button>
          )}
          <Button onClick={() => onNavigate({ name: 'subjects', openCreateToken: Date.now() })}>
            <Icon name="plus" size={14} />
            Nueva asignatura
          </Button>
          <Button onClick={() => goToSubjectPicker('Elige una asignatura para importar un apunte.')}>
            <Icon name="paperclip" size={14} />
            Importar apuntes
          </Button>
          <Button onClick={() => goToSubjectPicker('Elige una asignatura para crear una tarea.')}>
            <Icon name="check-circle" size={14} />
            Crear tarea
          </Button>
        </div>
      </div>

      <div className="page-body">
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Próximas tareas y eventos</h2>
          {isEmptyAgenda ? (
            <EmptyState
              icon="calendar"
              compact
              title="No tienes nada pendiente"
              description="Crea una tarea o un evento desde una asignatura o la Agenda."
              action={<Button onClick={() => onNavigate({ name: 'agenda' })}>Ir a la Agenda</Button>}
            />
          ) : (
            <div className={styles.agendaGroups}>
              {BUCKET_ORDER.map((bucket) => {
                const bucketTasks = tasksByBucket.map.get(bucket)!;
                const bucketEvents = eventsByBucket.get(bucket)!;
                if (bucketTasks.length === 0 && bucketEvents.length === 0) return null;
                return (
                  <div key={bucket} className={styles.agendaGroup}>
                    <span className={styles.agendaGroupLabel}>{AGENDA_BUCKET_LABEL[bucket]}</span>
                    <div className={styles.list}>
                      {bucketEvents.map((event) => (
                        <EventListItem
                          key={`event-${event.id}`}
                          event={event}
                          subjectLabel={event.subjectId ? subjectById.get(event.subjectId)?.name : undefined}
                          subjectColor={event.subjectId ? subjectById.get(event.subjectId)?.color : undefined}
                        />
                      ))}
                      {bucketTasks.map((task) => (
                        <TaskListItem
                          key={`task-${task.id}`}
                          task={task}
                          subjectLabel={subjectById.get(task.subjectId)?.name}
                          subjectColor={subjectById.get(task.subjectId)?.color}
                          onToggleComplete={() => handleCompleteTask(task.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              {tasksByBucket.noDate.length > 0 && (
                <div className={styles.agendaGroup}>
                  <span className={styles.agendaGroupLabel}>Sin fecha</span>
                  <div className={styles.list}>
                    {tasksByBucket.noDate.map((task) => (
                      <TaskListItem
                        key={task.id}
                        task={task}
                        subjectLabel={subjectById.get(task.subjectId)?.name}
                        subjectColor={subjectById.get(task.subjectId)?.color}
                        onToggleComplete={() => handleCompleteTask(task.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Continúa donde lo dejaste</h2>
          <div className={styles.recentGrid}>
            <div>
              <h3 className={styles.recentLabel}>Asignaturas recientes</h3>
              {summary.recentSubjects.length === 0 ? (
                <EmptyState compact icon="book" title="Aún no has abierto ninguna asignatura" />
              ) : (
                <ul className={styles.list}>
                  {summary.recentSubjects.map((subject) => (
                    <li key={subject.id}>
                      <button
                        className={styles.linkItem}
                        onClick={() => onNavigate({ name: 'subjectDetail', subjectId: subject.id })}
                      >
                        <span className={styles.dot} style={{ background: subject.color }} />
                        <span className={styles.linkText}>{subject.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className={styles.recentLabel}>Apuntes recientes</h3>
              {summary.recentDocuments.length === 0 ? (
                <EmptyState compact icon="file-text" title="Todavía no has abierto ningún apunte" />
              ) : (
                <ul className={styles.list}>
                  {summary.recentDocuments.map((doc) => {
                    const subject = subjectById.get(doc.subjectId);
                    return (
                      <li key={doc.id}>
                        <button
                          className={styles.linkItem}
                          onClick={() => {
                            void window.api.documents.registerOpen(doc.id);
                            openViewer(doc.id);
                          }}
                        >
                          {subject && <span className={styles.dot} style={{ background: subject.color }} />}
                          <span className={styles.linkText}>{doc.title}</span>
                          {doc.lastOpenedAt && <span className={styles.linkMeta}>{formatRelativeDay(doc.lastOpenedAt)}</span>}
                        </button>
                      </li>
                    );
                  })}
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
            {summary.weeklyStudySeconds > 0
              ? `Objetivo orientativo: ${formatDuration(summary.weeklyGoalSeconds)} a la semana (${weeklyPercent}%) · ${daysActive} ${pluralize(daysActive, 'día activo', 'días activos')}`
              : `Registra tu primera sesión de estudio con el Pomodoro para ver tu progreso aquí.`}
          </p>
        </section>
      </div>
    </div>
  );
}
