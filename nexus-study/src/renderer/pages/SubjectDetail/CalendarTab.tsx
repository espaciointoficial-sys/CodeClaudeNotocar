import { useEffect, useMemo, useState } from 'react';
import type { AcademicEvent, EventInput } from '@shared/types';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EventForm } from '../../components/calendar/EventForm';
import { EventListItem } from '../../components/calendar/EventListItem';
import { useToast } from '../../contexts/ToastContext';
import { agendaBucketFor, AGENDA_BUCKET_LABEL, type AgendaBucket } from '../../lib/format';
import styles from './CalendarTab.module.css';

const BUCKET_ORDER: AgendaBucket[] = ['overdue', 'today', 'week', 'later'];

export function CalendarTab({ subjectId }: { subjectId: string }) {
  const [events, setEvents] = useState<AcademicEvent[] | null>(null);
  const [formTarget, setFormTarget] = useState<AcademicEvent | 'new' | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { showToast } = useToast();

  const load = () => window.api.events.list({ subjectId }).then(setEvents);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  const grouped = useMemo(() => {
    if (!events) return null;
    const map = new Map<AgendaBucket, AcademicEvent[]>();
    for (const bucket of BUCKET_ORDER) map.set(bucket, []);
    for (const event of events) map.get(agendaBucketFor(event.startAt))?.push(event);
    return map;
  }, [events]);

  const handleCreate = async (input: EventInput) => {
    await window.api.events.create(input);
    setFormTarget(null);
    showToast('Evento creado.', 'success');
    load();
  };

  const handleEdit = async (input: EventInput) => {
    if (!formTarget || formTarget === 'new') return;
    await window.api.events.update(formTarget.id, input);
    setFormTarget(null);
    showToast('Evento actualizado.', 'success');
    load();
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    await window.api.events.remove(deletingId);
    setDeletingId(null);
    load();
  };

  return (
    <div>
      <div className={styles.toolbar}>
        <h2>Calendario de la asignatura</h2>
        <Button variant="primary" onClick={() => setFormTarget('new')}>
          + Nuevo evento
        </Button>
      </div>

      {!events ? null : events.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="Sin eventos programados"
          description="Añade exámenes, entregas, clases o sesiones de estudio."
          action={<Button onClick={() => setFormTarget('new')}>Crear evento</Button>}
        />
      ) : (
        BUCKET_ORDER.map((bucket) => {
          const items = grouped?.get(bucket) ?? [];
          if (items.length === 0) return null;
          return (
            <div key={bucket} className={styles.group}>
              <h3>{AGENDA_BUCKET_LABEL[bucket]}</h3>
              <div className={styles.list}>
                {items.map((event) => (
                  <EventListItem
                    key={event.id}
                    event={event}
                    onEdit={() => setFormTarget(event)}
                    onDelete={() => setDeletingId(event.id)}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}

      {formTarget === 'new' && (
        <EventForm fixedSubjectId={subjectId} onSubmit={handleCreate} onClose={() => setFormTarget(null)} />
      )}
      {formTarget && formTarget !== 'new' && (
        <EventForm fixedSubjectId={subjectId} event={formTarget} onSubmit={handleEdit} onClose={() => setFormTarget(null)} />
      )}
      {deletingId && (
        <ConfirmDialog
          title="Eliminar evento"
          message="Este evento se eliminará de forma permanente."
          confirmLabel="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}
