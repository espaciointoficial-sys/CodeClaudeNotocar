import { useState } from 'react';
import type { StudyTask, TaskInput, TaskPriority } from '@shared/types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormField } from '../ui/FormField';

interface TaskFormProps {
  subjectId: string;
  task?: StudyTask;
  onSubmit: (input: TaskInput) => Promise<void>;
  onClose: () => void;
}

export function TaskForm({ subjectId, task, onSubmit, onClose }: TaskFormProps) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(task?.dueDate ? task.dueDate.slice(0, 10) : '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (title.trim().length === 0) {
      setError('El título es obligatorio.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        subjectId,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        dueDate: dueDate ? new Date(`${dueDate}T23:59:59`).toISOString() : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la tarea.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={task ? 'Editar tarea' : 'Nueva tarea'}
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
      <FormField label="Descripción (opcional)">
        <textarea className="textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </FormField>
      <FormField label="Prioridad">
        <select className="select" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
          <option value="low">Baja</option>
          <option value="medium">Media</option>
          <option value="high">Alta</option>
        </select>
      </FormField>
      <FormField label="Fecha límite (opcional)">
        <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </FormField>
    </Modal>
  );
}
