import type { CSSProperties } from 'react';
import type { SubjectWithStats } from '@shared/types';
import { DropdownMenu } from '../ui/DropdownMenu';
import { Badge } from '../ui/Badge';
import { formatRelativeDay, pluralize } from '../../lib/format';
import styles from './SubjectCard.module.css';

interface SubjectCardProps {
  subject: SubjectWithStats;
  layout: 'grid' | 'list';
  onOpen: () => void;
  onEdit: () => void;
  onArchiveToggle: () => void;
  onDelete: () => void;
}

export function SubjectCard({ subject, layout, onOpen, onEdit, onArchiveToggle, onDelete }: SubjectCardProps) {
  return (
    <article
      className={layout === 'grid' ? styles.card : styles.row}
      style={{ '--subject-color': subject.color } as CSSProperties}
    >
      <button className={styles.mainArea} onClick={onOpen}>
        <div className={styles.iconBadge}>{subject.icon ?? subject.name.charAt(0).toUpperCase()}</div>
        <div className={styles.info}>
          <h3>{subject.name}</h3>
          <p className={styles.meta}>
            {[subject.professor, subject.term].filter(Boolean).join(' · ') || 'Sin detalles adicionales'}
          </p>
          <div className={styles.stats}>
            <span>
              {subject.documentCount} {pluralize(subject.documentCount, 'apunte', 'apuntes')}
            </span>
            <span>·</span>
            <span>
              {subject.pendingTaskCount} {pluralize(subject.pendingTaskCount, 'tarea pendiente', 'tareas pendientes')}
            </span>
            {subject.nextEventTitle && (
              <>
                <span>·</span>
                <Badge tone="accent">
                  {subject.nextEventTitle} · {formatRelativeDay(subject.nextEventAt!)}
                </Badge>
              </>
            )}
          </div>
        </div>
      </button>
      <DropdownMenu
        actions={[
          { label: 'Editar', onSelect: onEdit },
          { label: subject.status === 'active' ? 'Archivar' : 'Reactivar', onSelect: onArchiveToggle },
          { label: 'Eliminar', onSelect: onDelete, danger: true },
        ]}
      />
    </article>
  );
}
