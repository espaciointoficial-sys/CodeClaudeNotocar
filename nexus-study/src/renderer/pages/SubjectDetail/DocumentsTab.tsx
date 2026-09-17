import { useEffect, useMemo, useState, type DragEventHandler } from 'react';
import type { DocumentFileType, DocumentItem, DocumentUpdateInput, Folder, ImportResult } from '@shared/types';
import { ALLOWED_DOCUMENT_EXTENSIONS } from '@shared/types';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Icon } from '../../components/ui/Icon';
import { FolderRail } from '../../components/documents/FolderRail';
import { DocumentListItem } from '../../components/documents/DocumentListItem';
import { DocumentMetaForm } from '../../components/documents/DocumentMetaForm';
import { useToast } from '../../contexts/ToastContext';
import { useViewer } from '../../contexts/ViewerContext';
import styles from './DocumentsTab.module.css';

type SortKey = 'importedAt' | 'name' | 'lastOpenedAt' | 'favorite';

export function DocumentsTab({ subjectId, onChanged }: { subjectId: string; onChanged: () => void }) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[] | null>(null);
  const [activeFolder, setActiveFolder] = useState<string | null | 'all'>('all');
  const [search, setSearch] = useState('');
  const [fileType, setFileType] = useState<DocumentFileType | ''>('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('importedAt');
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<DocumentItem | null>(null);
  const { showToast } = useToast();
  const { openViewer } = useViewer();

  const loadFolders = () => window.api.folders.listBySubject(subjectId).then(setFolders);
  const loadDocuments = () => {
    window.api.documents
      .listBySubject(subjectId, {
        folderId: activeFolder === 'all' ? undefined : activeFolder,
        fileType: fileType || undefined,
        favoritesOnly: favoritesOnly || undefined,
        search: search || undefined,
        sortBy,
      })
      .then(setDocuments);
  };

  useEffect(() => {
    loadFolders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, activeFolder, search, fileType, favoritesOnly, sortBy]);

  const folderNameById = useMemo(() => new Map(folders.map((f) => [f.id, f.name])), [folders]);

  const importPaths = async (paths: string[]) => {
    if (paths.length === 0) return;
    setImporting(true);
    try {
      const results = await window.api.documents.importFiles(subjectId, paths, {
        subjectId,
        folderId: activeFolder === 'all' ? null : activeFolder,
      });
      setImportResults(results);
      const okCount = results.filter((r) => r.success).length;
      if (okCount > 0) showToast(`${okCount} apunte(s) importado(s).`, 'success');
      loadDocuments();
      onChanged();
    } finally {
      setImporting(false);
    }
  };

  const handleChooseFiles = async () => {
    const paths = await window.api.documents.chooseFiles();
    await importPaths(paths);
  };

  const handleDrop: DragEventHandler<HTMLDivElement> = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const paths = files.map((f) => window.fileUtils.getPathForFile(f)).filter((p) => p.length > 0);
    await importPaths(paths);
  };

  const handleToggleFavorite = async (doc: DocumentItem) => {
    await window.api.documents.update(doc.id, { isFavorite: !doc.isFavorite });
    loadDocuments();
  };

  const handleMetaSubmit = async (input: DocumentUpdateInput) => {
    if (!editingDoc) return;
    await window.api.documents.update(editingDoc.id, input);
    setEditingDoc(null);
    showToast('Apunte actualizado.', 'success');
    loadDocuments();
  };

  const handleMove = async (doc: DocumentItem, folderId: string | null) => {
    await window.api.documents.move(doc.id, folderId);
    loadDocuments();
  };

  const handleDelete = async () => {
    if (!deletingDoc) return;
    await window.api.documents.remove(deletingDoc.id);
    setDeletingDoc(null);
    showToast('Apunte eliminado (referencia y archivo).', 'success');
    loadDocuments();
    onChanged();
  };

  const handleOpen = async (doc: DocumentItem) => {
    await window.api.documents.registerOpen(doc.id);
    openViewer(doc.id);
  };

  return (
    <div>
      <FolderRail
        folders={folders}
        activeFolderId={activeFolder}
        onSelect={setActiveFolder}
        onCreate={(name) => window.api.folders.create({ subjectId, name }).then(loadFolders)}
        onRename={(id, name) => window.api.folders.update(id, { name }).then(loadFolders)}
        onDelete={(id) => window.api.folders.remove(id).then(() => { loadFolders(); loadDocuments(); })}
      />

      <div className={styles.toolbar}>
        <input
          className="input"
          placeholder="Buscar por título o contenido…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 240 }}
        />
        <select className="select" value={fileType} onChange={(e) => setFileType(e.target.value as DocumentFileType | '')}>
          <option value="">Todos los tipos</option>
          {ALLOWED_DOCUMENT_EXTENSIONS.map((ext) => (
            <option key={ext} value={ext}>
              {ext.toUpperCase()}
            </option>
          ))}
        </select>
        <select className="select" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}>
          <option value="importedAt">Fecha de importación</option>
          <option value="name">Nombre</option>
          <option value="lastOpenedAt">Última apertura</option>
          <option value="favorite">Favoritos primero</option>
        </select>
        <label className={styles.favToggle}>
          <input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} />
          Solo favoritos
        </label>
        <Button variant="primary" onClick={handleChooseFiles} loading={importing} className={styles.importButton}>
          + Importar apuntes
        </Button>
      </div>

      <div
        className={styles.dropzone}
        data-active={dragOver}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {documents === null ? (
          <Spinner />
        ) : documents.length === 0 ? (
          <EmptyState
            icon="paperclip"
            title="No hay apuntes aquí todavía"
            description="Arrastra archivos PDF, JPG, PNG o WEBP a esta zona, o usa el botón Importar apuntes."
            action={<Button variant="primary" onClick={handleChooseFiles}>Importar apuntes</Button>}
          />
        ) : (
          <div className={styles.list}>
            {documents.map((doc) => (
              <DocumentListItem
                key={doc.id}
                document={doc}
                folderLabel={doc.folderId ? folderNameById.get(doc.folderId) : 'Sin tema'}
                folders={folders}
                onOpen={() => handleOpen(doc)}
                onToggleFavorite={() => handleToggleFavorite(doc)}
                onEdit={() => setEditingDoc(doc)}
                onMove={(folderId) => handleMove(doc, folderId)}
                onDelete={() => setDeletingDoc(doc)}
              />
            ))}
          </div>
        )}
        {dragOver && <div className={styles.dropHint}>Suelta los archivos para importarlos</div>}
      </div>

      {editingDoc && (
        <DocumentMetaForm document={editingDoc} folders={folders} onSubmit={handleMetaSubmit} onClose={() => setEditingDoc(null)} />
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
      {importResults && (
        <ConfirmDialog
          title="Resultado de la importación"
          message={
            <ul className={styles.importResults}>
              {importResults.map((r, i) => (
                <li key={i} data-ok={r.success}>
                  <Icon name={r.success ? 'check-circle' : 'x'} size={15} />
                  <span>
                    {r.fileName}
                    {!r.success && r.error ? <em>{r.error}</em> : null}
                  </span>
                </li>
              ))}
            </ul>
          }
          confirmLabel="Cerrar"
          danger={false}
          onConfirm={() => setImportResults(null)}
          onCancel={() => setImportResults(null)}
        />
      )}
    </div>
  );
}
