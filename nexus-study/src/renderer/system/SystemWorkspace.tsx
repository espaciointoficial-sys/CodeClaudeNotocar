import { memo, useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Icon, type IconName } from '../components/ui/Icon';
import { formatTime } from '../lib/format';
import { SystemMonitorProvider, useSystemMonitor } from './SystemContext';
import { Overview } from './pages/Overview';
import { Performance } from './pages/Performance';
import { Processes } from './pages/Processes';
import { Storage } from './pages/Storage';
import { Network } from './pages/Network';
import { Hardware } from './pages/Hardware';
import { Battery } from './pages/Battery';
import { Security } from './pages/Security';
import { QuickActions } from './pages/QuickActions';
import { SystemSettings } from './pages/SystemSettings';
import styles from './System.module.css';
import nav from '../components/layout/Sidebar.module.css';

export type SystemPage =
  | 'overview'
  | 'performance'
  | 'processes'
  | 'storage'
  | 'network'
  | 'hardware'
  | 'battery'
  | 'security'
  | 'actions'
  | 'settings';

interface PageMeta {
  key: SystemPage;
  label: string;
  icon: IconName;
  description: string;
}

/** Un solo lugar define el menú, el título y el subtítulo de cada pantalla. */
const PAGES: PageMeta[] = [
  { key: 'overview', label: 'Resumen', icon: 'gauge', description: 'Lo esencial del estado de tu equipo, de un vistazo.' },
  { key: 'performance', label: 'Rendimiento', icon: 'activity', description: 'Procesador, memoria, gráfica y discos en detalle.' },
  { key: 'processes', label: 'Procesos', icon: 'list', description: 'Qué se está ejecutando y cuánto consume. Solo para consultar.' },
  { key: 'storage', label: 'Almacenamiento', icon: 'hard-drive', description: 'Espacio de cada unidad y lo que ocupa Nexus Study.' },
  { key: 'network', label: 'Red', icon: 'wifi', description: 'Tu conexión y el tráfico de esta sesión.' },
  { key: 'hardware', label: 'Hardware', icon: 'cpu', description: 'De qué está hecho tu equipo.' },
  { key: 'battery', label: 'Batería', icon: 'battery', description: 'Nivel, carga y autonomía estimada.' },
  { key: 'security', label: 'Seguridad', icon: 'shield', description: 'Estado de las protecciones del sistema. Nexus Study solo informa.' },
  { key: 'actions', label: 'Acciones rápidas', icon: 'zap', description: 'Abre las herramientas del sistema sin buscarlas.' },
  { key: 'settings', label: 'Ajustes del sistema', icon: 'sliders', description: 'Cómo se comporta el monitor y qué datos consulta.' },
];

const PAGE_TITLES: Record<SystemPage, string> = Object.fromEntries(
  PAGES.map((page) => [page.key, page.label]),
) as Record<SystemPage, string>;

interface SidebarProps {
  page: SystemPage;
  onNavigate: (page: SystemPage) => void;
  onExitSpace: () => void;
  /** En un equipo sin batería esa pantalla no tiene nada que contar, así que no se ofrece. */
  showBattery: boolean;
}

// memo: la barra lateral no depende de las métricas, así que no tiene por qué repintarse cada vez
// que llega una muestra nueva.
const SystemSidebar = memo(function SystemSidebar({ page, onNavigate, onExitSpace, showBattery }: SidebarProps) {
  const items = PAGES.filter((item) => item.key !== 'battery' || showBattery);
  return (
    <nav className={nav.sidebar} aria-label="Navegación del espacio Sistema">
      <div className={nav.brand}>
        <span className={nav.brandMark}>
          <Icon name="monitor" size={18} />
        </span>
        <span className={nav.brandName}>Sistema</span>
      </div>

      <div className={nav.navScroll}>
        <ul className={nav.navList}>
          {items.map((item) => (
            <li key={item.key}>
              <button
                className={nav.navItem}
                data-active={page === item.key}
                onClick={() => onNavigate(item.key)}
              >
                <span className={nav.navIcon}>
                  <Icon name={item.icon} size={17} />
                </span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className={nav.footer}>
        <button className={nav.quickAction} onClick={onExitSpace} data-tooltip="Cambiar de espacio">
          <Icon name="grid" size={15} />
          Cambiar de espacio
        </button>
      </div>
    </nav>
  );
});

function SystemBody({ page }: { page: SystemPage }) {
  switch (page) {
    case 'performance':
      return <Performance />;
    case 'processes':
      return <Processes />;
    case 'storage':
      return <Storage />;
    case 'network':
      return <Network />;
    case 'hardware':
      return <Hardware />;
    case 'battery':
      return <Battery />;
    case 'security':
      return <Security />;
    case 'actions':
      return <QuickActions />;
    case 'settings':
      return <SystemSettings />;
    default:
      return <Overview />;
  }
}

function SystemShell({ active, onExitSpace }: { active: boolean; onExitSpace: () => void }) {
  const [page, setPage] = useState<SystemPage>('overview');
  const { snapshot, battery, intervalMs, refresh } = useSystemMonitor();

  const meta = PAGES.find((item) => item.key === page);
  const showBattery = snapshot !== null && snapshot.hasBattery !== false && battery !== null;

  // Si el equipo resulta no tener batería mientras estabas en esa pantalla, se vuelve al resumen
  // en lugar de dejar una sección vacía sin salida en el menú.
  const currentPage = page === 'battery' && !showBattery ? 'overview' : page;

  const updatedLabel =
    intervalMs === null
      ? 'Actualizaciones en pausa'
      : snapshot
        ? `Última actualización ${formatTime(snapshot.sampledAt)}`
        : 'Leyendo datos del equipo…';

  return (
    <div className={`${styles.workspace} ${active ? '' : styles.hidden}`}>
      <SystemSidebar page={currentPage} onNavigate={setPage} onExitSpace={onExitSpace} showBattery={showBattery} />
      <main className={styles.content}>
        <PageHeader
          title={PAGE_TITLES[currentPage]}
          description={`${meta?.description ?? ''} · ${updatedLabel}`}
          actions={
            <Button onClick={refresh} data-tooltip="Volver a leer ahora">
              <Icon name="refresh" size={15} />
              Actualizar
            </Button>
          }
        />
        <div className="page-body">
          <SystemBody page={currentPage} />
        </div>
      </main>
    </div>
  );
}

/**
 * Espacio Sistema. Mientras `active` sea falso el proveedor no consulta nada: el espacio se queda
 * montado para conservar la pantalla y el historial, pero sin ningún temporizador en marcha.
 */
export function SystemWorkspace({ active, onExitSpace }: { active: boolean; onExitSpace: () => void }) {
  return (
    <SystemMonitorProvider active={active}>
      <SystemShell active={active} onExitSpace={onExitSpace} />
    </SystemMonitorProvider>
  );
}
