import { useEffect, useRef, useState } from 'react';
import type { Bookmark, DocumentItem, Note } from '@shared/types';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { formatDateTime } from '../../lib/format';
import styles from './DocumentSidePanel.module.css';

interface DocumentSidePanelProps {
  document: DocumentItem;
  currentPage: number;
  isPdf: boolean;
  onJumpToPage: (page: number) => void;
}

export function DocumentSidePanel({ document, currentPage, isPdf, onJumpToPage }: DocumentSidePanelProps) {
  const [tab, setTab] = useState<'notes' | 'bookmarks'>('notes');
  const [note, setNote] = useState<Note | null>(null);
  const [content, setContent] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [bookmarkLabel, setBookmarkLabel] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadNote = () =>
    window.api.notes.listByDocument(document.id).then((notes) => {
      const existing = notes[0] ?? null;
      setNote(existing);
      setContent(existing?.content ?? '');
    });

  const loadBookmarks = () => window.api.bookmarks.listByDocument(document.id).then(setBookmarks);

  useEffect(() => {
    loadNote();
    if (isPdf) loadBookmarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document.id]);

  const scheduleSave = (value: string) => {
    setSaveState('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (note) {
        await window.api.notes.update(note.id, { content: value });
      } else {
        const created = await window.api.notes.create({ subjectId: document.subjectId, documentId: document.id, content: value });
        setNote(created);
      }
      setSaveState('saved');
    }, 700);
  };

  const addBookmark = async () => {
    await window.api.bookmarks.create({ documentId: document.id, page: currentPage, label: bookmarkLabel.trim() || null });
    setBookmarkLabel('');
    loadBookmarks();
  };

  const removeBookmark = async (id: string) => {
    await window.api.bookmarks.remove(id);
    loadBookmarks();
  };

  return (
    <div className={styles.panel}>
      {isPdf && (
        <div className={styles.tabs}>
          <button data-active={tab === 'notes'} onClick={() => setTab('notes')}>
            Notas
          </button>
          <button data-active={tab === 'bookmarks'} onClick={() => setTab('bookmarks')}>
            Marcadores {bookmarks.length > 0 ? `(${bookmarks.length})` : ''}
          </button>
        </div>
      )}

      {tab === 'notes' || !isPdf ? (
        <div className={styles.notes}>
          <textarea
            className={styles.textarea}
            placeholder="Escribe notas sobre este apunte…"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              scheduleSave(e.target.value);
            }}
          />
          <span className={styles.saveIndicator}>
            {saveState === 'saving' ? 'Guardando…' : saveState === 'saved' ? `Guardado · ${note ? formatDateTime(note.updatedAt) : ''}` : ''}
          </span>
        </div>
      ) : (
        <div className={styles.bookmarks}>
          {isPdf && (
            <div className={styles.addBookmark}>
              <input
                className="input"
                placeholder={`Título del marcador (página ${currentPage})`}
                value={bookmarkLabel}
                onChange={(e) => setBookmarkLabel(e.target.value)}
              />
              <Button size="sm" variant="primary" onClick={addBookmark}>
                + Añadir en pág. {currentPage}
              </Button>
            </div>
          )}
          {bookmarks.length === 0 ? (
            <p className={styles.empty}>Sin marcadores todavía.</p>
          ) : (
            <ul className={styles.bookmarkList}>
              {bookmarks.map((b) => (
                <li key={b.id}>
                  <button onClick={() => onJumpToPage(b.page)}>
                    Pág. {b.page} {b.label ? `· ${b.label}` : ''}
                  </button>
                  <button className={styles.removeBookmark} onClick={() => removeBookmark(b.id)} aria-label="Eliminar marcador" title="Eliminar marcador">
                    <Icon name="x" size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
