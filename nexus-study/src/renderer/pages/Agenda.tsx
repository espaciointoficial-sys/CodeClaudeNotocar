import { useEffect, useMemo, useState } from 'react';
import type { AcademicEvent, AcademicEventType, EventInput, StudyTask, SubjectWithStats } from '@shared/types';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EventForm } from '../components/calendar/EventForm';
import { EventListItem } from '../components/calendar/EventListItem';
import { TaskListItem } from '../components/tasks/TaskListItem';
import { useToast } from '../contexts/ToastContext';
import { agendaBucketFor, AGENDA_BUCKET_LABEL, type AgendaBucket } from '../lib/format';
import styles from './Agenda.module.css';

const BUCKET_ORDER: AgendaBucket[] = ['overdue', 'today', 'week', 'later'];

export function Agenda() {
  const [subjects, setSubjects] = useState<SubjectWithStats[]>([]);
  const [events, setEvents] = useState<AcademicEvent[] | null>(null);
  const [tasks, setTasks] = useState<StudyTask[] | null>(null);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<AcademicEventType | ''>('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AcademicEvent | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const { showToast } = useToast();

  const load = () => {
    window.api.events.list({ subjectId: subjectFilter || undefined, type: typeFilter || undefined }).then(setEvents);
    window.api.tasks.listAll({ subjectId: subjectFilter || undefined, status: 'pending' }).then(setTasks);
  };

  useEffect(() => {
    window.api.subjects.list(false).then(setSubjects);
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectFilter, typeFilter]);

  const subjectNameById = useMemo(() => new Map(subjects.map((s) => [s.id, s.name])), [subjects]);
  const subjectColorById = useMemo(() => new Map(subjects.map((s) => [s.id, s.color])), [subjects]);

  const eventsByBucket = useMemo(() => {
    const map = new Map<AgendaBucket, AcademicEvent[]>();
    for (const bucket of BUCKET_ORDER) map.set(bucket, []);
    events?.forEach((event) => map.get(agendaBucketFor(event.startAt))?.push(event));
    return map;
  }, [events]);

  const tasksByBucket = useMemo(() => {
    const map = new Map<AgendaBucket, StudyTask[]>();
    for (const bucket of BUCKET_ORDER) map.set(bucket, []);
    const noDate: StudyTask[] = [];
    tasks?.forEach((task) => {
      if (task.dueDate) map.get(agendaBucketFor(task.dueDate))?.push(task);
      else noDate.push(task);
    });
    return { map, noDate };
  }, [tasks]);

  const handleCreateEvent = async (input: EventInput) => {
    await window.api.events.create(input);
    setFormOpen(false);
    showToast('Evento creado.', 'success');
    load();
  };

  const handleEditEvent = async (input: EventInput) => {
    if (!editingEvent) return;
    await window.api.events.update(editingEvent.id, input);
    setEditingEvent(null);
    showToast('Evento actualizado.', 'success');
    load();
  };

  const handleDeleteEvent = async () => {
    if (!deletingEventId) return;
    await window.api.events.remove(deletingEventId);
    setDeletingEventId(null);
    load();
  };

  const handleCompleteTask = async (task: StudyTask) => {
    await window.api.tasks.setCompleted(task.id, true);
    load();
  };

  const isEmpty = events?.length === 0 && tasks?.length === 0;

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Tus próximos exámenes, entregas y tareas en un solo lugar."
        actions={<Button variant="primary" onClick={() => setFormOpen(true)}>+ Nuevo evento</Button>}
      />
      <div className="page-body">
        <div className={styles.toolbar}>
          <select className="select" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
            <option value="">Todas las asignaturas</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select className="select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as AcademicEventType | '')}>
            <option value="">Todos los tipos de evento</option>
            <option value="exam">Examen</option>
            <option value="assignment">Entrega</option>
            <option value="class">Clase</option>
            <option value="study_session">Sesión de estudio</option>
            <option value="other">Otro</option>
          </select>
        </div>

        {events === null || tasks === null ? null : isEmpty ? (
          <EmptyState
            icon="calendar"
            title="No tienes nada programado"
            description="Crea un examen, una entrega o registra una sesión de estudio."
            action={<Button onClick={() => setFormOpen(true)}>Crear evento</Button>}
          />
        ) : (
          <>
            {BUCKET_ORDER.map((bucket) => {
              const bucketEvents = eventsByBucket.get(bucket) ?? [];
              const bucketTasks = tasksByBucket.map.get(bucket) ?? [];
              if (bucketEvents.length === 0 && bucketTasks.length === 0) return null;
              return (
                <section key={bucket} className={styles.group}>
                  <h3 data-bucket={bucket}>{AGENDA_BUCKET_LABEL[bucket]}</h3>
                  <div className={styles.list}>
                    {bucketEvents.map((event) => (
                      <EventListItem
                        key={`event-${event.id}`}
                        event={event}
                        subjectLabel={event.subjectId ? subjectNameById.get(event.subjectId) : undefined}
                        subjectColor={event.subjectId ? subjectColorById.get(event.subjectId) : undefined}
                        onEdit={() => setEditingEvent(event)}
                        onDelete={() => setDeletingEventId(event.id)}
                      />
                    ))}
                    {bucketTasks.map((task) => (
                      <TaskListItem
                        key={`task-${task.id}`}
                        task={task}
                        subjectLabel={subjectNameById.get(task.subjectId)}
                        subjectColor={subjectColorById.get(task.subjectId)}
                        onToggleComplete={() => handleCompleteTask(task)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}

            {tasksByBucket.noDate.length > 0 && (
              <section className={styles.group}>
                <h3>Tareas sin fecha</h3>
                <div className={styles.list}>
                  {tasksByBucket.noDate.map((task) => (
                    <TaskListItem
                      key={task.id}
                      task={task}
                      subjectLabel={subjectNameById.get(task.subjectId)}
                      subjectColor={subjectColorById.get(task.subjectId)}
                      onToggleComplete={() => handleCompleteTask(task)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {formOpen && <EventForm onSubmit={handleCreateEvent} onClose={() => setFormOpen(false)} />}
      {editingEvent && <EventForm event={editingEvent} onSubmit={handleEditEvent} onClose={() => setEditingEvent(null)} />}
      {deletingEventId && (
        <ConfirmDialog
          title="Eliminar evento"
          message="Este evento se eliminará de forma permanente."
          confirmLabel="Eliminar"
          onConfirm={handleDeleteEvent}
          onCancel={() => setDeletingEventId(null)}
        />
      )}
    </div>
  );
}
