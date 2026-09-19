import { useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Spinner } from '../../components/ui/Spinner';
import { useToast } from '../../contexts/ToastContext';
import { useQuickActions } from '../SystemContext';
import { SectionCard } from '../widgets';
import styles from '../System.module.css';

export function QuickActions() {
  const actions = useQuickActions();
  const { showToast } = useToast();
  const [running, setRunning] = useState<string | null>(null);

  if (!actions) return <Spinner />;

  if (actions.length === 0) {
    return (
      <EmptyState
        icon="zap"
        title="Sin acciones disponibles"
        description="Las herramientas del sistema de esta plataforma no se pueden abrir de forma estándar desde una aplicación."
      />
    );
  }

  const run = (id: string) => {
    setRunning(id);
    window.api.monitor
      .runQuickAction(id)
      .catch((error: Error) => showToast(error.message || 'No se ha podido abrir la herramienta.', 'error'))
      .finally(() => setRunning(null));
  };

  return (
    <>
      <SectionCard icon="zap" title="Herramientas del sistema">
        <p className={styles.caption} style={{ marginTop: 0, marginBottom: 'var(--space-4)' }}>
          Cada botón abre una herramienta del propio sistema operativo para que decidas tú qué hacer en ella. Ninguno
          ejecuta nada por su cuenta, ni cierra procesos, ni borra archivos.
        </p>
        <div className={styles.actionGrid}>
          {actions.map((action) => (
            <button
              key={action.id}
              className={styles.action}
              onClick={() => run(action.id)}
              disabled={running === action.id}
              title={action.description}
            >
              <span className={styles.actionIcon}>
                <Icon name={action.icon as IconName} size={16} />
              </span>
              <span className={styles.actionText}>
                <span className={styles.actionLabel}>{action.label}</span>
                <span className={styles.actionHint}>{action.description}</span>
              </span>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard icon="shield" title="Cómo funciona esta pantalla">
        <p className={styles.caption} style={{ marginTop: 0 }}>
          La lista de acciones está fijada en el código de Nexus Study y no se puede ampliar desde la interfaz: no
          existe ninguna forma de escribir un comando y que la aplicación lo ejecute. Tampoco se piden permisos de
          administrador; si una herramienta los necesita, será el propio sistema quien te los pida.
        </p>
      </SectionCard>
    </>
  );
}
