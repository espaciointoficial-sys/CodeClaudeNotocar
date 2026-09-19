import { useEffect, useState, type ReactNode } from 'react';
import type { HomeSummary, SubjectWithStats, SystemSnapshot } from '@shared/types';
import { Icon, type IconName } from '../components/ui/Icon';
import { formatFileSize, formatRelativeDay, pluralize } from '../lib/format';
import styles from './SpaceSelector.module.css';

/** El uso de CPU necesita dos lecturas para existir, así que el selector refresca mientras se ve. */
const SNAPSHOT_INTERVAL_MS = 2000;

interface SummaryRow {
  label: string;
  value: ReactNode;
}

function SummaryList({ rows, loading }: { rows: SummaryRow[]; loading: boolean }) {
  return (
    <dl className={styles.summary}>
      {rows.map((row) => (
        <div key={row.label} className={styles.summaryRow}>
          <dt>{row.label}</dt>
          <dd className={loading ? styles.loading : undefined}>{loading ? 'Cargando…' : row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

interface SpaceCardProps {
  icon: IconName;
  title: string;
  shortcut: string;
  description: string;
  rows: SummaryRow[];
  loading: boolean;
  className?: string;
  onOpen: () => void;
}

function SpaceCard({ icon, title, shortcut, description, rows, loading, className, onOpen }: SpaceCardProps) {
  return (
    <button className={`${styles.card} ${className ?? ''}`} onClick={onOpen} aria-label={`Abrir ${title}`}>
      <span className={styles.cardIcon}>
        <Icon name={icon} size={24} />
      </span>
      <span className={styles.cardTitle}>
        {title}
        <span className={styles.shortcut}>{shortcut}</span>
      </span>
      <span className={styles.cardText}>{description}</span>
      <SummaryList rows={rows} loading={loading} />
      <span className={styles.open}>
        Abrir
        <Icon name="chevron-right" size={15} />
      </span>
    </button>
  );
}

/**
 * Primera pantalla de la aplicación: elige entre el espacio académico y el panel del equipo.
 *
 * Los resúmenes son datos reales, nunca de ejemplo: mientras no han llegado se indica que se están
 * cargando en lugar de enseñar un cero que parecería cierto.
 */
export function SpaceSelector({ onOpen }: { onOpen: (space: 'study' | 'system') => void }) {
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [subjects, setSubjects] = useState<SubjectWithStats[] | null>(null);
  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([window.api.home.summary(), window.api.subjects.list()]).then(
      ([loadedSummary, loadedSubjects]) => {
        if (cancelled) return;
        setSummary(loadedSummary);
        setSubjects(loadedSubjects);
      },
      () => {
        /* si la consulta falla, las tarjetas se quedan en "Cargando…" y el resto sigue funcionando */
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Solo mientras el selector está en pantalla: al entrar en un espacio se desmonta y el intervalo
  // se limpia con él. La consulta es la barata (~1 ms), no la que lanza utilidades del sistema.
  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      window.api.monitor.snapshot().then(
        (next) => {
          if (!cancelled) setSnapshot(next);
        },
        () => {
          /* sin datos del equipo la tarjeta sigue mostrando su estado de carga */
        },
      );
    };
    tick();
    const id = setInterval(tick, SNAPSHOT_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === '1') onOpen('study');
      if (event.key === '2') onOpen('system');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onOpen]);

  const nextEvent = summary?.upcomingEvents[0];
  const activeSubjects = subjects?.length ?? 0;
  const pendingTasks = summary?.pendingTasks.length ?? 0;
  const freeSpace = snapshot?.disks.reduce((total, disk) => total + disk.freeBytes, 0) ?? 0;

  return (
    <div className={styles.screen}>
      <header className={styles.intro}>
        <span className={styles.brand}>
          <Icon name="book" size={15} />
          Nexus Study
        </span>
        <h1 className={styles.title}>¿Con qué quieres empezar?</h1>
        <p className={styles.subtitle}>
          Dos espacios independientes: tu material de estudio y el estado de tu ordenador. Puedes cambiar de uno a otro
          cuando quieras sin perder nada.
        </p>
      </header>

      <div className={styles.cards}>
        <SpaceCard
          icon="graduation-cap"
          title="Estudio"
          shortcut="1"
          description="Asignaturas, biblioteca, apuntes, tareas, agenda, Pomodoro y tus estadísticas de estudio."
          loading={summary === null}
          onOpen={() => onOpen('study')}
          rows={[
            { label: 'Asignaturas activas', value: activeSubjects },
            {
              label: 'Tareas pendientes',
              value: `${pendingTasks} ${pluralize(pendingTasks, 'tarea', 'tareas')}`,
            },
            {
              label: 'Próxima fecha',
              value: nextEvent ? `${nextEvent.title} · ${formatRelativeDay(nextEvent.startAt)}` : 'Nada a la vista',
            },
          ]}
        />

        <SpaceCard
          icon="monitor"
          title="Sistema"
          shortcut="2"
          description="Rendimiento, procesos, almacenamiento, red, batería, hardware y seguridad de este equipo."
          loading={snapshot === null}
          className={styles.system}
          onOpen={() => onOpen('system')}
          rows={[
            {
              label: 'Uso de CPU',
              value: snapshot?.cpu.usagePercent == null ? 'Midiendo…' : `${Math.round(snapshot.cpu.usagePercent)}%`,
            },
            { label: 'Memoria en uso', value: `${Math.round(snapshot?.memory.usagePercent ?? 0)}%` },
            { label: 'Espacio libre', value: formatFileSize(freeSpace) },
          ]}
        />
      </div>

      <p className={styles.footNote}>
        Los datos del equipo se leen en local y solo se muestran aquí. Pulsa <strong>1</strong> o <strong>2</strong> para
        abrir un espacio, y <strong>Escape</strong> para volver a esta pantalla.
      </p>
    </div>
  );
}
