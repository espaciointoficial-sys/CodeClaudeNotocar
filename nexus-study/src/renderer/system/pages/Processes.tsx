import { useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Spinner } from '../../components/ui/Spinner';
import { useToast } from '../../contexts/ToastContext';
import { formatFileSize } from '../../lib/format';
import { useQuickActions, useSystemSample } from '../SystemContext';
import { NOT_AVAILABLE, formatPercent, formatSpeed } from '../format';
import { SectionCard } from '../widgets';
import styles from '../System.module.css';

type SortKey = 'cpu' | 'memory' | 'disk' | 'name';
type Filter = 'all' | 'heavy' | 'app';

/** Se pintan los procesos que de verdad consumen; la lista completa se puede ver ampliando esto. */
const VISIBLE_LIMIT = 60;
/** Umbrales del filtro "con alto consumo": lo bastante altos para dejar fuera el ruido de fondo. */
const HEAVY_CPU_PERCENT = 1;
const HEAVY_MEMORY_BYTES = 200 * 1024 * 1024;

/**
 * En una compilación de producción los procesos de la aplicación se llaman como el ejecutable; en
 * desarrollo, "electron". Se comparan los dos para que el filtro funcione en ambos casos.
 */
function isOwnProcess(name: string): boolean {
  const lower = name.toLowerCase();
  return lower === 'nexus study' || lower === 'electron';
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'heavy', label: 'Alto consumo' },
  { key: 'app', label: 'Nexus Study' },
];

export function Processes() {
  const { sample } = useSystemSample();
  const actions = useQuickActions();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('memory');
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(() => {
    if (!sample) return null;
    const needle = search.trim().toLowerCase();
    const filtered = sample.processes.filter((item) => {
      if (needle && !item.name.toLowerCase().includes(needle)) return false;
      if (filter === 'app') return isOwnProcess(item.name);
      if (filter === 'heavy') {
        return (item.cpuPercent ?? 0) >= HEAVY_CPU_PERCENT || item.memoryBytes >= HEAVY_MEMORY_BYTES;
      }
      return true;
    });
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'es');
      if (sortBy === 'cpu') return (b.cpuPercent ?? -1) - (a.cpuPercent ?? -1);
      if (sortBy === 'disk') return (b.diskBytesPerSecond ?? -1) - (a.diskBytesPerSecond ?? -1);
      return b.memoryBytes - a.memoryBytes;
    });
    return { rows: sorted.slice(0, VISIBLE_LIMIT), total: filtered.length };
  }, [sample, search, sortBy, filter]);

  const canOpenTaskManager = actions?.some((action) => action.id === 'task-manager') ?? false;

  const openTaskManager = () => {
    window.api.monitor
      .runQuickAction('task-manager')
      .catch((error: Error) => showToast(error.message || 'No se ha podido abrir la herramienta.', 'error'));
  };

  if (!visible) return <Spinner />;

  if (sample && sample.processes.length === 0) {
    return (
      <EmptyState
        icon="alert-triangle"
        title="No se pudo leer la lista de procesos"
        description="Este sistema no ha devuelto información de procesos. El resto del monitor sigue funcionando."
      />
    );
  }

  return (
    <>
      <div className={styles.processToolbar}>
        <input
          className="input"
          style={{ maxWidth: 240 }}
          placeholder="Buscar proceso…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Buscar proceso"
        />
        <div className={styles.filters} role="group" aria-label="Filtrar procesos">
          {FILTERS.map((item) => (
            <button key={item.key} data-active={filter === item.key} onClick={() => setFilter(item.key)}>
              {item.label}
            </button>
          ))}
        </div>
        <select
          className="select"
          style={{ width: 'auto' }}
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as SortKey)}
          aria-label="Ordenar procesos"
        >
          <option value="memory">Más memoria</option>
          <option value="cpu">Más CPU</option>
          <option value="disk">Más disco</option>
          <option value="name">Nombre</option>
        </select>
        <span className={styles.caption}>
          {visible.total > VISIBLE_LIMIT
            ? `Mostrando ${VISIBLE_LIMIT} de ${visible.total} procesos`
            : `${visible.total} procesos`}
        </span>
      </div>

      {visible.rows.length === 0 ? (
        <EmptyState icon="search" title="Sin resultados" description="Ningún proceso coincide con ese filtro." />
      ) : (
        <SectionCard icon="list" title="Procesos activos">
          <table className={styles.processTable}>
            <thead>
              <tr>
                <th>Proceso</th>
                <th>CPU</th>
                <th>Memoria</th>
                <th>Disco</th>
                <th>PID</th>
              </tr>
            </thead>
            <tbody>
              {visible.rows.map((item) => (
                <tr key={item.pid}>
                  <td className={`${styles.processName} ${isOwnProcess(item.name) ? styles.ownProcess : ''}`}>
                    {item.name}
                  </td>
                  <td className={styles.numeric}>{formatPercent(item.cpuPercent)}</td>
                  <td className={styles.numeric}>{formatFileSize(item.memoryBytes)}</td>
                  <td className={styles.numeric}>
                    {item.diskBytesPerSecond == null ? '—' : formatSpeed(item.diskBytesPerSecond)}
                  </td>
                  <td className={styles.numeric}>{item.pid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      )}

      <SectionCard icon="alert-triangle" title="Esta pantalla solo consulta">
        <p className={styles.caption} style={{ marginTop: 0 }}>
          Nexus Study no cierra procesos: hacerlo a ciegas puede tirar abajo algo que el sistema necesita. Si quieres
          terminar alguno, ábrelo en la herramienta de Windows, que avisa de las consecuencias y protege los procesos
          críticos.
        </p>
        {canOpenTaskManager ? (
          <div style={{ marginTop: 'var(--space-3)' }}>
            <Button onClick={openTaskManager} icon={<Icon name="external-link" size={15} />}>
              Abrir el Administrador de tareas
            </Button>
          </div>
        ) : (
          <p className={styles.caption}>Gestor de procesos del sistema: {NOT_AVAILABLE} en esta plataforma.</p>
        )}
      </SectionCard>
    </>
  );
}
