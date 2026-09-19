import { memo, useEffect, useState } from 'react';
import type { View } from '../../App';
import { PomodoroMiniWidget } from '../pomodoro/PomodoroMiniWidget';
import { usePomodoro } from '../../contexts/PomodoroContext';
import { useToast } from '../../contexts/ToastContext';
import { Icon, type IconName } from '../ui/Icon';
import styles from './Sidebar.module.css';

interface NavItem {
  key: View['name'];
  label: string;
  icon: IconName;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Estudio',
    items: [
      { key: 'home', label: 'Inicio', icon: 'home' },
      { key: 'subjects', label: 'Asignaturas', icon: 'book' },
      { key: 'library', label: 'Biblioteca', icon: 'search' },
      { key: 'agenda', label: 'Agenda', icon: 'calendar' },
    ],
  },
  {
    label: 'Progreso',
    items: [{ key: 'stats', label: 'Estadísticas', icon: 'bar-chart' }],
  },
  {
    label: 'Complementos',
    items: [
      { key: 'weather', label: 'Tiempo', icon: 'sun' },
      { key: 'dashboard', label: 'Dashboard', icon: 'layout' },
    ],
  },
  {
    label: 'Aplicación',
    items: [{ key: 'settings', label: 'Ajustes', icon: 'sliders' }],
  },
];

const COLLAPSE_STORAGE_KEY = 'nexus.sidebarCollapsed';

interface SidebarProps {
  activeView: View['name'];
  onNavigate: (view: View) => void;
  /** Vuelve al selector inicial. El espacio no se cierra: sigue montado con todo su estado. */
  onExitSpace: () => void;
}

// memo: mientras el Pomodoro corre, la barra lateral se repinta cada segundo por el temporizador.
// La lista de navegación no cambia en ese tic, así que se evita rehacerla 60 veces por minuto.
const NavList = memo(function NavList({
  items,
  activeView,
  onNavigate,
  collapsed,
}: Pick<SidebarProps, 'activeView' | 'onNavigate'> & { items: NavItem[]; collapsed: boolean }) {
  return (
    <ul className={styles.navList}>
      {items.map((item) => (
        <li key={item.key}>
          <button
            className={styles.navItem}
            data-active={activeView === item.key}
            aria-label={item.label}
            data-tooltip={collapsed ? item.label : undefined}
            onClick={() => onNavigate({ name: item.key } as View)}
          >
            <span className={styles.navIcon}>
              <Icon name={item.icon} size={17} />
            </span>
            {!collapsed && item.label}
          </button>
        </li>
      ))}
    </ul>
  );
});

export function Sidebar({ activeView, onNavigate, onExitSpace }: SidebarProps) {
  const pomodoro = usePomodoro();
  const { showToast } = useToast();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      /* almacenamiento no disponible: la preferencia simplemente no persiste */
    }
  }, [collapsed]);

  const importNotes = () => {
    showToast('Elige una asignatura para importar un apunte.', 'info');
    onNavigate({ name: 'subjects' });
  };

  const startStudySession = () => {
    if (pomodoro.status !== 'running') {
      pomodoro.start();
      showToast('Sesión Pomodoro iniciada.', 'success');
    }
  };

  return (
    <nav className={styles.sidebar} data-collapsed={collapsed} aria-label="Navegación principal">
      <div className={styles.brand}>
        <span className={styles.brandMark}>
          <Icon name="book" size={18} />
        </span>
        {!collapsed && <span className={styles.brandName}>Nexus Study</span>}
        <button
          className={styles.collapseToggle}
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
          data-tooltip={collapsed ? 'Expandir' : undefined}
        >
          <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={14} />
        </button>
      </div>

      <div className={styles.navScroll}>
        {NAV_GROUPS.map((group, i) => (
          <div className={styles.navGroup} key={group.label}>
            {!collapsed && <span className={styles.groupLabel}>{group.label}</span>}
            <NavList items={group.items} activeView={activeView} onNavigate={onNavigate} collapsed={collapsed} />
            {collapsed && i < NAV_GROUPS.length - 1 && <div className={styles.divider} />}
          </div>
        ))}

        <div className={styles.quickActions}>
          {!collapsed && <span className={styles.groupLabel}>Acciones rápidas</span>}
          <button
            className={styles.quickAction}
            onClick={() => onNavigate({ name: 'subjects', openCreateToken: Date.now() })}
            aria-label="Nueva asignatura"
            data-tooltip={collapsed ? 'Nueva asignatura' : undefined}
          >
            <Icon name="plus" size={15} />
            {!collapsed && 'Nueva asignatura'}
          </button>
          <button
            className={styles.quickAction}
            onClick={importNotes}
            aria-label="Importar apuntes"
            data-tooltip={collapsed ? 'Importar apuntes' : undefined}
          >
            <Icon name="paperclip" size={15} />
            {!collapsed && 'Importar apuntes'}
          </button>
          <button
            className={styles.quickAction}
            onClick={startStudySession}
            disabled={pomodoro.status === 'running'}
            aria-label="Iniciar sesión de estudio"
            data-tooltip={collapsed ? 'Iniciar sesión de estudio' : undefined}
          >
            <Icon name="play" size={15} />
            {!collapsed && (pomodoro.status === 'running' ? 'Sesión en curso' : 'Iniciar sesión de estudio')}
          </button>
        </div>
      </div>

      <div className={styles.spaceSwitch}>
        <button
          className={styles.quickAction}
          onClick={onExitSpace}
          aria-label="Cambiar de espacio"
          data-tooltip="Cambiar de espacio"
        >
          <Icon name="grid" size={15} />
          {!collapsed && 'Cambiar de espacio'}
        </button>
      </div>

      <div className={styles.footer}>
        <PomodoroMiniWidget compact={collapsed} />
      </div>
    </nav>
  );
}
