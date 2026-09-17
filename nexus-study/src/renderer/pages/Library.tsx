import { useEffect, useMemo, useRef, useState } from 'react';
import type { DocumentFileType, DocumentItem, DocumentUpdateInput, Folder, SubjectWithStats } from '@shared/types';
import { ALLOWED_DOCUMENT_EXTENSIONS } from '@shared/types';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { DocumentListItem } from '../components/documents/DocumentListItem';
import { DocumentMetaForm } from '../components/documents/DocumentMetaForm';
import { useToast } from '../contexts/ToastContext';
import { useViewer } from '../contexts/ViewerContext';
import { daysAgoTimestamp } from '../lib/format';
import styles from './Library.module.css';

type SortKey = 'relevance' | 'lastOpenedAt' | 'importedAt' | 'name';
type DateFilter = 'any' | 'week' | 'month';

export function Library({ focusSearch }: { focusSearch?: boolean }) {
  const [subjects, setSubjects] = useState<SubjectWithStats[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[] | null>(null);
  const [foldersById, setFoldersById] = useState<Map<string, Folder>>(new Map());
  const [search, setSearch] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [fileType, setFileType] = useState<DocumentFileType | ''>('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('any');
  const [sortBy, setSortBy] = useState<SortKey>('relevance');
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<DocumentItem | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const { openViewer } = useViewer();

  useEffect(() => {
    window.api.subjects.list(true).then(setSubjects);
  }, []);

  useEffect(() => {
    if (focusSearch) searchRef.current?.focus();
  }, [focusSearch]);

  const load = () => {
    window.api.documents
      .listLibrary({
        subjectId: subjectId || undefined,
        fileType: fileType || undefined,
        favoritesOnly: favoritesOnly || undefined,
        search: search || undefined,
        sortBy,
      })
      .then(async (docs) => {
        setDocuments(docs);
        const subjectIds = Array.from(new Set(docs.map((d) => d.subjectId)));
        const folderLists = await Promise.all(subjectIds.map((id) => window.api.folders.listBySubject(id)));
        const map = new Map<string, Folder>();
        folderLists.flat().forEach((f) => map.set(f.id, f));
        setFoldersById(map);
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, subjectId, fileType, favoritesOnly, sortBy]);

  const subjectNameById = useMemo(() => new Map(subjects.map((s) => [s.id, s.name])), [subjects]);

  const visibleDocuments = useMemo(() => {
    if (!documents) return null;
    if (dateFilter === 'any') return documents;
    const cutoff = daysAgoTimestamp(dateFilter === 'week' ? 7 : 30);
    return documents.filter((d) => new Date(d.importedAt).getTime() >= cutoff);
  }, [documents, dateFilter]);

  const handleToggleFavorite = async (doc: DocumentItem) => {
    await window.api.documents.update(doc.id, { isFavorite: !doc.isFavorite });
    load();
  };

  const handleMetaSubmit = async (input: DocumentUpdateInput) => {
    if (!editingDoc) return;
    await window.api.documents.update(editingDoc.id, input);
    setEditingDoc(null);
    showToast('Apunte actualizado.', 'success');
    load();
  };

  const handleDelete = async () => {
    if (!deletingDoc) return;
    await window.api.documents.remove(deletingDoc.id);
    setDeletingDoc(null);
    showToast('Apunte eliminado.', 'success');
    load();
  };

  const handleOpen = async (doc: DocumentItem) => {
    await window.api.documents.registerOpen(doc.id);
    openViewer(doc.id);
  };

  return (
    <div>
      <PageHeader title="Biblioteca" description="Busca entre todos tus apuntes, sin importar la asignatura." />
      <div className="page-body">
        <div className={styles.toolbar}>
          <input
            ref={searchRef}
            className="input"
            placeholder="Buscar por título, etiqueta, nombre de archivo o contenido del PDF…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 320 }}
          />
          <select className="select" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">Todas las asignaturas</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select className="select" value={fileType} onChange={(e) => setFileType(e.target.value as DocumentFileType | '')}>
            <option value="">Todos los tipos</option>
            {ALLOWED_DOCUMENT_EXTENSIONS.map((ext) => (
              <option key={ext} value={ext}>
                {ext.toUpperCase()}
              </option>
            ))}
          </select>
          <select className="select" value={dateFilter} onChange={(e) => setDateFilter(e.target.value as DateFilter)}>
            <option value="any">Cualquier fecha</option>
            <option value="week">Última semana</option>
            <option value="month">Último mes</option>
          </select>
          <select className="select" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}>
            <option value="relevance">Relevancia</option>
            <option value="lastOpenedAt">Última apertura</option>
            <option value="importedAt">Importación</option>
            <option value="name">Nombre</option>
          </select>
          <label className={styles.favToggle}>
            <input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} />
            Solo favoritos
          </label>
        </div>

        {!visibleDocuments ? (
          <Spinner />
        ) : visibleDocuments.length === 0 ? (
          <EmptyState
            icon="search"
            title="Sin resultados"
            description="Prueba con otros términos de búsqueda o cambia los filtros. La búsqueda incluye el texto dentro de los PDF, no solo el título."
          />
        ) : (
          <div className={styles.list}>
            {visibleDocuments.map((doc) => (
              <DocumentListItem
                key={doc.id}
                document={doc}
                subjectLabel={subjectNameById.get(doc.subjectId)}
                folderLabel={doc.folderId ? foldersById.get(doc.folderId)?.name ?? 'Tema eliminado' : 'Sin tema'}
                onOpen={() => handleOpen(doc)}
                onToggleFavorite={() => handleToggleFavorite(doc)}
                onEdit={() => setEditingDoc(doc)}
                onDelete={() => setDeletingDoc(doc)}
              />
            ))}
          </div>
        )}
      </div>

      {editingDoc && (
        <DocumentMetaForm
          document={editingDoc}
          folders={Array.from(foldersById.values()).filter((f) => f.subjectId === editingDoc.subjectId)}
          onSubmit={handleMetaSubmit}
          onClose={() => setEditingDoc(null)}
        />
      )}
      {deletingDoc && (
        <ConfirmDialog
          title="Eliminar apunte"
          message={`Se eliminará "${deletingDoc.title}" y su archivo local. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setDeletingDoc(null)}
        />
      )}
    </div>
  );
}
