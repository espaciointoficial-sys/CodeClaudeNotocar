import { useState } from 'react';
import type { Subject, SubjectInput } from '@shared/types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormField } from '../ui/FormField';
import { ColorPicker, IconPicker } from '../ui/ColorIconPicker';
import { SUBJECT_COLORS } from '../../lib/constants';

interface SubjectFormProps {
  subject?: Subject;
  onSubmit: (input: SubjectInput) => Promise<void>;
  onClose: () => void;
}

export function SubjectForm({ subject, onSubmit, onClose }: SubjectFormProps) {
  const [name, setName] = useState(subject?.name ?? '');
  const [color, setColor] = useState(subject?.color ?? SUBJECT_COLORS[0]!);
  const [icon, setIcon] = useState<string | null>(subject?.icon ?? null);
  const [professor, setProfessor] = useState(subject?.professor ?? '');
  const [term, setTerm] = useState(subject?.term ?? '');
  const [description, setDescription] = useState(subject?.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (name.trim().length === 0) {
      setError('El nombre es obligatorio.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        color,
        icon,
        professor: professor.trim() || null,
        term: term.trim() || null,
        description: description.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la asignatura.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={subject ? 'Editar asignatura' : 'Nueva asignatura'}
      onClose={onClose}
      width={520}
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
      <FormField label="Nombre" htmlFor="subject-name" required error={error ?? undefined}>
        <input
          id="subject-name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Programación"
          autoFocus
        />
      </FormField>

      <FormField label="Color">
        <ColorPicker value={color} onChange={setColor} />
      </FormField>

      <FormField label="Icono (opcional)">
        <IconPicker value={icon} onChange={setIcon} />
      </FormField>

      <FormField label="Profesor (opcional)" htmlFor="subject-professor">
        <input
          id="subject-professor"
          className="input"
          value={professor}
          onChange={(e) => setProfessor(e.target.value)}
          placeholder="Ej. Dra. Ana Ruiz"
        />
      </FormField>

      <FormField label="Curso o cuatrimestre (opcional)" htmlFor="subject-term">
        <input
          id="subject-term"
          className="input"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Ej. 2º curso"
        />
      </FormField>

      <FormField label="Descripción (opcional)" htmlFor="subject-description">
        <textarea
          id="subject-description"
          className="textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </FormField>
    </Modal>
  );
}
