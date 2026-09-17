import styles from './Spinner.module.css';

export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className={styles.wrap} role="status">
      <span className={styles.circle} aria-hidden />
      <span>{label}</span>
    </div>
  );
}
