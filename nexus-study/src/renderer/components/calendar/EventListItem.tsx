import type { AcademicEvent, AcademicEventType } from '@shared/types';
import { Badge } from '../ui/Badge';
import { DropdownMenu } from '../ui/DropdownMenu';
import { formatDateTime } from '../../lib/format';
import styles from './EventListItem.module.css';

const TYPE_LABEL: Record<AcademicEventType, string> = {
  exam: 'Examen',
  assignment: 'Entrega',
  class: 'Clase',
  study_session: 'Sesión de estudio',
  other: 'Otro',
};

const TYPE_TONE = {
  exam: 'danger',
  assignment: 'warning',
  class: 'accent',
  study_session: 'success',
  other: 'neutral',
} as const;

interface EventListItemProps {
  event: AcademicEvent;
  subjectLabel?: string;
  onEdit: () => void;
  onDelete: () => void;
}

export function EventListItem({ event, subjectLabel, onEdit, onDelete }: EventListItemProps) {
  return (
    <div className={styles.item}>
      <div className={styles.body}>
        <div className={styles.top}>
          <Badge tone={TYPE_TONE[event.type]}>{TYPE_LABEL[event.type]}</Badge>
          {subjectLabel && <span className={styles.subject}>{subjectLabel}</span>}
        </div>
        <p className={styles.title}>{event.title}</p>
        <p className={styles.date}>{formatDateTime(event.startAt)}</p>
        {event.description && <p className={styles.description}>{event.description}</p>}
      </div>
      <DropdownMenu
        actions={[
          { label: 'Editar', onSelect: onEdit },
          { label: 'Eliminar', danger: true, onSelect: onDelete },
        ]}
      />
    </div>
  );
}
