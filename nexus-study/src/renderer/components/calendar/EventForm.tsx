import { useEffect, useState } from 'react';
import type { AcademicEvent, AcademicEventType, EventInput, SubjectWithStats } from '@shared/types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormField } from '../ui/FormField';

const TYPE_LABEL: Record<AcademicEventType, string> = {
  exam: 'Examen',
  assignment: 'Entrega',
  class: 'Clase',
  study_session: 'Sesión de estudio',
  other: 'Otro',
};

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface EventFormProps {
  event?: AcademicEvent;
  fixedSubjectId?: string;
  defaultStartAt?: string;
  onSubmit: (input: EventInput) => Promise<void>;
  onClose: () => void;
}

export function EventForm({ event, fixedSubjectId, defaultStartAt, onSubmit, onClose }: EventFormProps) {
  const [subjects, setSubjects] = useState<SubjectWithStats[]>([]);
  const [subjectId, setSubjectId] = useState(event?.subjectId ?? fixedSubjectId ?? '');
  const [title, setTitle] = useState(event?.title ?? '');
  const [type, setType] = useState<AcademicEventType>(event?.type ?? 'exam');
  const [startAt, setStartAt] = useState(toLocalInputValue(event?.startAt ?? defaultStartAt ?? new Date().toISOString()));
  const [endAt, setEndAt] = useState(event?.endAt ? toLocalInputValue(event.endAt) : '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!fixedSubjectId) window.api.subjects.list(false).then(setSubjects);
  }, [fixedSubjectId]);

  const handleSubmit = async () => {
    if (title.trim().length === 0) {
      setError('El título es obligatorio.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        subjectId: subjectId || null,
        title: title.trim(),
        type,
        startAt: new Date(startAt).toISOString(),
        endAt: endAt ? new Date(endAt).toISOString() : null,
        description: description.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el evento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={event ? 'Editar evento' : 'Nuevo evento'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving}>
            Guardar
          </Button>
        </>
      }
    >
      <FormField label="Título" required error={error ?? undefined}>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </FormField>
      <FormField label="Tipo">
        <select className="select" value={type} onChange={(e) => setType(e.target.value as AcademicEventType)}>
          {Object.entries(TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </FormField>
      {!fixedSubjectId && (
        <FormField label="Asignatura (opcional)">
          <select className="select" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">Sin asignatura</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </FormField>
      )}
      <FormField label="Inicio">
        <input type="datetime-local" className="input" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
      </FormField>
      <FormField label="Fin (opcional)">
        <input type="datetime-local" className="input" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
      </FormField>
      <FormField label="Descripción (opcional)">
        <textarea className="textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </FormField>
    </Modal>
  );
}
