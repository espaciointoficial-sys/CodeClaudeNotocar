import type { StudyTask } from '@shared/types';
import { Badge } from '../ui/Badge';
import { DropdownMenu } from '../ui/DropdownMenu';
import { formatRelativeDay } from '../../lib/format';
import styles from './TaskListItem.module.css';

const PRIORITY_TONE = { low: 'neutral', medium: 'accent', high: 'danger' } as const;
const PRIORITY_LABEL = { low: 'Baja', medium: 'Media', high: 'Alta' } as const;

interface TaskListItemProps {
  task: StudyTask;
  subjectLabel?: string;
  subjectColor?: string;
  onToggleComplete: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function TaskListItem({ task, subjectLabel, subjectColor, onToggleComplete, onEdit, onDelete }: TaskListItemProps) {
  const overdue = task.status === 'pending' && task.dueDate && new Date(task.dueDate) < new Date();
  const actions = [
    ...(onEdit ? [{ label: 'Editar', onSelect: onEdit }] : []),
    ...(onDelete ? [{ label: 'Eliminar', danger: true, onSelect: onDelete }] : []),
  ];

  return (
    <div className={styles.item} data-done={task.status === 'completed'}>
      <input type="checkbox" checked={task.status === 'completed'} onChange={onToggleComplete} aria-label="Completar tarea" />
      <div className={styles.body}>
        <p className={styles.title}>{task.title}</p>
        <div className={styles.meta}>
          {subjectLabel ? (
            <span className={styles.subject}>
              {subjectColor && <span className={styles.dot} style={{ background: subjectColor }} />}
              {subjectLabel}
            </span>
          ) : null}
          <Badge tone={PRIORITY_TONE[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
          {task.dueDate ? (
            <Badge tone={overdue ? 'danger' : 'neutral'}>{overdue ? 'Vencida' : formatRelativeDay(task.dueDate)}</Badge>
          ) : null}
        </div>
      </div>
      {actions.length > 0 && <DropdownMenu actions={actions} />}
    </div>
  );
}
