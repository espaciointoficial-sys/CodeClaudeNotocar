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

const PRIMARY_NAV: NavItem[] = [
  { key: 'home', label: 'Inicio', icon: 'home' },
  { key: 'subjects', label: 'Asignaturas', icon: 'book' },
  { key: 'agenda', label: 'Agenda', icon: 'calendar' },
  { key: 'library', label: 'Biblioteca', icon: 'search' },
];

const SECONDARY_NAV: NavItem[] = [
  { key: 'stats', label: 'Estadísticas', icon: 'bar-chart' },
  { key: 'dashboard', label: 'Dashboard', icon: 'layout' },
  { key: 'settings', label: 'Ajustes', icon: 'sliders' },
];

interface SidebarProps {
  activeView: View['name'];
  onNavigate: (view: View) => void;
}

function NavList({ items, activeView, onNavigate }: SidebarProps & { items: NavItem[] }) {
  return (
    <ul className={styles.navList}>
      {items.map((item) => (
        <li key={item.key}>
          <button
            className={styles.navItem}
            data-active={activeView === item.key}
            onClick={() => onNavigate({ name: item.key } as View)}
          >
            <span className={styles.navIcon}>
              <Icon name={item.icon} size={17} />
            </span>
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function Sidebar({ activeView, onNavigate }: SidebarProps) {
  const pomodoro = usePomodoro();
  const { showToast } = useToast();

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
    <nav className={styles.sidebar} aria-label="Navegación principal">
      <div className={styles.brand}>
        <span className={styles.brandMark}>
          <Icon name="book" size={18} />
        </span>
        <span className={styles.brandName}>Nexus Study</span>
      </div>

      <NavList items={PRIMARY_NAV} activeView={activeView} onNavigate={onNavigate} />
      <div className={styles.divider} />
      <NavList items={SECONDARY_NAV} activeView={activeView} onNavigate={onNavigate} />

      <div className={styles.quickActions}>
        <span className={styles.quickActionsLabel}>Acciones rápidas</span>
        <button
          className={styles.quickAction}
          onClick={() => onNavigate({ name: 'subjects', openCreateToken: Date.now() })}
        >
          <Icon name="plus" size={15} />
          Nueva asignatura
        </button>
        <button className={styles.quickAction} onClick={importNotes}>
          <Icon name="paperclip" size={15} />
          Importar apuntes
        </button>
        <button className={styles.quickAction} onClick={startStudySession} disabled={pomodoro.status === 'running'}>
          <Icon name="play" size={15} />
          {pomodoro.status === 'running' ? 'Sesión en curso' : 'Iniciar sesión de estudio'}
        </button>
      </div>

      <div className={styles.footer}>
        <PomodoroMiniWidget />
      </div>
    </nav>
  );
}
