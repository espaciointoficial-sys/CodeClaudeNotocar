import type { ReactNode } from 'react';
import { Icon, type IconName } from '../components/ui/Icon';
import { NOT_AVAILABLE } from './format';
import styles from './System.module.css';

/** Barra de porcentaje con un color de aviso cuando el recurso empieza a escasear. */
export function UsageBar({ percent }: { percent: number }) {
  const level = percent >= 90 ? 'high' : percent >= 75 ? 'medium' : 'low';
  return (
    <div className={styles.barTrack}>
      <div className={styles.barFill} data-level={level} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  );
}

/**
 * Gráfico de línea mínimo: un <polyline> normalizado dentro de un viewBox de 100×100 que el CSS
 * estira al ancho disponible. No hace falta ninguna librería de gráficos para dibujar sesenta
 * puntos, y evitarla ahorra tanto tamaño de paquete como trabajo en cada repintado.
 */
export function Sparkline({ values, max, label }: { values: number[]; max?: number; label: string }) {
  if (values.length < 2) {
    return <p className={styles.sparkEmpty}>Recogiendo datos…</p>;
  }
  const top = Math.max(max ?? 0, ...values, 1);
  const step = 100 / (values.length - 1);
  const points = values
    .map((value, index) => `${(index * step).toFixed(2)},${(100 - (value / top) * 100).toFixed(2)}`)
    .join(' ');
  return (
    <svg className={styles.spark} viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={label}>
      {/* non-scaling-stroke evita que el estirado horizontal deforme el grosor de la línea. */}
      <polyline points={points} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

interface CardProps {
  icon: IconName;
  title: string;
  children?: ReactNode;
  /** Texto a la derecha del título, para un valor secundario o una etiqueta. */
  aside?: ReactNode;
}

/** Tarjeta contenedora. Lo que va dentro lo decide cada pantalla. */
export function SectionCard({ icon, title, aside, children }: CardProps) {
  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <span className={styles.cardIcon}>
          <Icon name={icon} size={16} />
        </span>
        <h2>{title}</h2>
        {aside ? <span className={styles.cardAside}>{aside}</span> : null}
      </div>
      {children}
    </section>
  );
}

interface MetricCardProps extends CardProps {
  value: string;
  caption?: ReactNode;
  percent?: number;
}

/** Tarjeta de una métrica: valor grande, barra opcional y un pie explicativo. */
export function MetricCard({ icon, title, aside, value, caption, percent, children }: MetricCardProps) {
  return (
    <SectionCard icon={icon} title={title} aside={aside}>
      <p className={styles.metricValue}>{value}</p>
      {percent !== undefined && <UsageBar percent={percent} />}
      {caption ? <p className={styles.caption}>{caption}</p> : null}
      {children}
    </SectionCard>
  );
}

export type InfoRow = [label: string, value: ReactNode];

/** Lista de pares dato/valor. Lo que el sistema no informa se muestra como "No disponible". */
export function InfoList({ rows }: { rows: InfoRow[] }) {
  return (
    <dl className={styles.infoList}>
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value == null || value === '' ? NOT_AVAILABLE : value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Hueco con explicación para lo que este sistema operativo no permite consultar. */
export function Unavailable({ children }: { children: ReactNode }) {
  return <p className={styles.unavailable}>{children}</p>;
}

/** Aviso discreto: informa de algo que conviene saber, sin alarmar ni pedir nada. */
export function AlertList({ alerts }: { alerts: { id: string; text: string }[] }) {
  if (alerts.length === 0) return null;
  return (
    <section className={styles.alerts} aria-label="Estado del equipo">
      {alerts.map((alert) => (
        <p key={alert.id} className={styles.alert}>
          <Icon name="alert-triangle" size={15} />
          {alert.text}
        </p>
      ))}
    </section>
  );
}
