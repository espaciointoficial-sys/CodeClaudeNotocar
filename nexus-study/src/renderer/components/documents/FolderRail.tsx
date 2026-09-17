import { useState } from 'react';
import type { Folder } from '@shared/types';
import { DropdownMenu } from '../ui/DropdownMenu';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import styles from './FolderRail.module.css';

interface FolderRailProps {
  folders: Folder[];
  activeFolderId: string | null | 'all';
  onSelect: (folderId: string | null | 'all') => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function FolderRail({ folders, activeFolderId, onSelect, onCreate, onRename, onDelete }: FolderRailProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const submitCreate = () => {
    if (newName.trim()) onCreate(newName.trim());
    setNewName('');
    setCreating(false);
  };

  const submitRename = () => {
    if (renamingId && renameValue.trim()) onRename(renamingId, renameValue.trim());
    setRenamingId(null);
  };

  return (
    <div className={styles.rail}>
      <button className={styles.chip} data-active={activeFolderId === 'all'} onClick={() => onSelect('all')}>
        Todos
      </button>
      <button className={styles.chip} data-active={activeFolderId === null} onClick={() => onSelect(null)}>
        Sin tema
      </button>
      {folders.map((folder) =>
        renamingId === folder.id ? (
          <input
            key={folder.id}
            className={`input ${styles.renameInput}`}
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e) => e.key === 'Enter' && submitRename()}
          />
        ) : (
          <div key={folder.id} className={styles.chipWrap}>
            <button className={styles.chip} data-active={activeFolderId === folder.id} onClick={() => onSelect(folder.id)}>
              {folder.name}
            </button>
            <DropdownMenu
              actions={[
                {
                  label: 'Renombrar',
                  onSelect: () => {
                    setRenamingId(folder.id);
                    setRenameValue(folder.name);
                  },
                },
                { label: 'Eliminar', danger: true, onSelect: () => setDeletingId(folder.id) },
              ]}
            />
          </div>
        ),
      )}

      {creating ? (
        <input
          className={`input ${styles.renameInput}`}
          autoFocus
          placeholder="Nombre del tema"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onBlur={submitCreate}
          onKeyDown={(e) => e.key === 'Enter' && submitCreate()}
        />
      ) : (
        <button className={styles.addChip} onClick={() => setCreating(true)}>
          + Tema
        </button>
      )}

      {deletingId && (
        <ConfirmDialog
          title="Eliminar tema"
          message="Los apuntes de este tema pasarán a 'Sin tema'. El tema se eliminará."
          confirmLabel="Eliminar"
          onConfirm={() => {
            onDelete(deletingId);
            setDeletingId(null);
          }}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}
