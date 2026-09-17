import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ icon = 'inbox', title, description, action, compact }: EmptyStateProps) {
  return (
    <div className={compact ? `${styles.container} ${styles.compact}` : styles.container}>
      <div className={styles.icon}>
        <Icon name={icon} size={28} />
      </div>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
