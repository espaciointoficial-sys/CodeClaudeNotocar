import { useState } from 'react';
import type { DocumentItem, DocumentUpdateInput, Folder } from '@shared/types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormField } from '../ui/FormField';

interface DocumentMetaFormProps {
  document: DocumentItem;
  folders: Folder[];
  onSubmit: (input: DocumentUpdateInput) => Promise<void>;
  onClose: () => void;
}

export function DocumentMetaForm({ document, folders, onSubmit, onClose }: DocumentMetaFormProps) {
  const [title, setTitle] = useState(document.title);
  const [folderId, setFolderId] = useState<string>(document.folderId ?? '');
  const [description, setDescription] = useState(document.description ?? '');
  const [tagsText, setTagsText] = useState(document.tags.join(', '));
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
        title: title.trim(),
        folderId: folderId || null,
        description: description.trim() || null,
        tags: tagsText
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Editar apunte"
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
      <FormField label="Tema" hint="Archivo original: no se modifica al cambiar el tema.">
        <select className="select" value={folderId} onChange={(e) => setFolderId(e.target.value)}>
          <option value="">Sin tema</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Etiquetas" hint="Sepáralas con comas, por ejemplo: examen, importante">
        <input className="input" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
      </FormField>
      <FormField label="Descripción (opcional)">
        <textarea className="textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </FormField>
    </Modal>
  );
}
