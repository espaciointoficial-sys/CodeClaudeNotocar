import type { DocumentItem, Folder } from '@shared/types';
import { DropdownMenu } from '../ui/DropdownMenu';
import { Badge } from '../ui/Badge';
import { Icon, type IconName } from '../ui/Icon';
import { formatDate, formatFileSize } from '../../lib/format';
import styles from './DocumentListItem.module.css';

const FILE_ICON: Record<string, IconName> = { pdf: 'file', jpg: 'image', jpeg: 'image', png: 'image', webp: 'image' };

interface DocumentListItemProps {
  document: DocumentItem;
  subjectLabel?: string;
  folderLabel?: string;
  folders?: Folder[];
  onOpen: () => void;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onMove?: (folderId: string | null) => void;
  onDelete: () => void;
}

export function DocumentListItem({
  document,
  subjectLabel,
  folderLabel,
  folders,
  onOpen,
  onToggleFavorite,
  onEdit,
  onMove,
  onDelete,
}: DocumentListItemProps) {
  const moveActions = onMove
    ? [
        { label: 'Mover a: Sin tema', onSelect: () => onMove(null) },
        ...(folders ?? []).map((f) => ({ label: `Mover a: ${f.name}`, onSelect: () => onMove(f.id) })),
      ]
    : [];

  return (
    <div className={styles.item}>
      <button className={styles.main} onClick={onOpen}>
        <span className={styles.icon}>
          <Icon name={FILE_ICON[document.fileType] ?? 'file'} size={20} />
        </span>
        <div className={styles.info}>
          <p className={styles.title}>{document.title}</p>
          <p className={styles.meta}>
            {[subjectLabel, folderLabel, formatDate(document.importedAt), formatFileSize(document.sizeBytes)]
              .filter(Boolean)
              .join(' · ')}
            {document.pageCount ? ` · ${document.pageCount} pág.` : ''}
          </p>
          {document.tags.length > 0 && (
            <div className={styles.tags}>
              {document.tags.map((tag) => (
                <Badge key={tag} tone="neutral">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </button>

      <button
        className={styles.favorite}
        data-active={document.isFavorite}
        onClick={onToggleFavorite}
        aria-label={document.isFavorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
        title={document.isFavorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
      >
        <Icon name="star" size={16} filled={document.isFavorite} />
      </button>

      <DropdownMenu
        actions={[
          { label: 'Editar metadatos', onSelect: onEdit },
          ...moveActions,
          { label: 'Eliminar', danger: true, onSelect: onDelete },
        ]}
      />
    </div>
  );
}
