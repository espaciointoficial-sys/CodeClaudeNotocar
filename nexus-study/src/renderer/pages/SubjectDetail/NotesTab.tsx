import { useEffect, useMemo, useRef, useState } from 'react';
import type { Note } from '@shared/types';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { formatDateTime } from '../../lib/format';
import styles from './NotesTab.module.css';

function NoteEditor({ note, onSaved, onDelete }: { note: Note; onSaved: () => void; onDelete: () => void }) {
  const [title, setTitle] = useState(note.title ?? '');
  const [content, setContent] = useState(note.content);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'idle'>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = (nextTitle: string, nextContent: string) => {
    setSaveState('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await window.api.notes.update(note.id, { title: nextTitle || null, content: nextContent });
      setSaveState('saved');
      onSaved();
    }, 700);
  };

  return (
    <>
      <div className={styles.editorHeader}>
        <input
          className={styles.titleInput}
          value={title}
          placeholder="Título de la nota"
          onChange={(e) => {
            setTitle(e.target.value);
            scheduleSave(e.target.value, content);
          }}
        />
        <div className={styles.editorActions}>
          <span className={styles.saveIndicator}>
            {saveState === 'saving' ? 'Guardando…' : saveState === 'saved' ? 'Guardado' : ''}
          </span>
          <Button size="sm" variant="danger" onClick={onDelete}>
            Eliminar
          </Button>
        </div>
      </div>
      <textarea
        className={styles.textarea}
        value={content}
        placeholder="Escribe aquí…"
        onChange={(e) => {
          setContent(e.target.value);
          scheduleSave(title, e.target.value);
        }}
      />
    </>
  );
}

export function NotesTab({ subjectId }: { subjectId: string }) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () =>
    window.api.notes.listBySubject(subjectId).then((list) => {
      setNotes(list.filter((n) => !n.documentId));
    });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  const selected = useMemo(() => notes?.find((n) => n.id === selectedId) ?? null, [notes, selectedId]);

  const filtered = useMemo(() => {
    if (!notes) return [];
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => (n.title ?? '').toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
  }, [notes, search]);

  const handleCreate = async () => {
    const note = await window.api.notes.create({ subjectId, title: 'Nueva nota', content: '' });
    await load();
    setSelectedId(note.id);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    await window.api.notes.remove(deletingId);
    setDeletingId(null);
    if (selectedId === deletingId) setSelectedId(null);
    load();
  };

  if (!notes) return null;

  return (
    <div className={styles.layout}>
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <input className="input" placeholder="Buscar notas…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button size="sm" variant="primary" onClick={handleCreate}>
            + Nota
          </Button>
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon="edit" title="Sin notas" description="Crea notas para resumir ideas clave de la asignatura." />
        ) : (
          <ul className={styles.noteList}>
            {filtered.map((note) => (
              <li key={note.id}>
                <button className={styles.noteItem} data-active={note.id === selectedId} onClick={() => setSelectedId(note.id)}>
                  <strong>{note.title || 'Sin título'}</strong>
                  <span>{formatDateTime(note.updatedAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.editor}>
        {!selected ? (
          <EmptyState icon="edit" title="Selecciona o crea una nota" />
        ) : (
          <NoteEditor key={selected.id} note={selected} onSaved={load} onDelete={() => setDeletingId(selected.id)} />
        )}
      </div>

      {deletingId && (
        <ConfirmDialog
          title="Eliminar nota"
          message="Esta nota se eliminará de forma permanente."
          confirmLabel="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}
