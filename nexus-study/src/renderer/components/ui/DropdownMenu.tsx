import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import styles from './DropdownMenu.module.css';

interface MenuAction {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

export function DropdownMenu({ trigger, actions }: { trigger?: ReactNode; actions: MenuAction[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  return (
    <div className={styles.wrap} ref={ref}>
      <button
        className={styles.trigger}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Más opciones"
        data-tooltip={open ? undefined : 'Más opciones'}
      >
        {trigger ?? <Icon name="more-vertical" size={16} />}
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          {actions.map((action) => (
            <button
              key={action.label}
              role="menuitem"
              className={`${styles.item} ${action.danger ? styles.danger : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                action.onSelect();
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
