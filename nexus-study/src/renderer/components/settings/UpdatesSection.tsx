import { useState } from 'react';
import type { UpdateState } from '@shared/types';
import { Button } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';
import { useUpdateStatus } from '../../hooks/useUpdateStatus';
import styles from './UpdatesSection.module.css';

// Repositorio real del proyecto (mismo que usa electron-builder para publicar en GitHub Releases).
const REPO_URL = 'https://github.com/espaciointoficial-sys/CodeClaudeNotocar';

const STATE_LABEL: Record<UpdateState, string> = {
  idle: 'Sin comprobar todavía.',
  checking: 'Buscando actualizaciones…',
  'up-to-date': 'Nexus Study está actualizado.',
  available: 'Hay una nueva versión disponible.',
  downloading: 'Descargando la actualización…',
  downloaded: 'Actualización lista para instalar.',
  error: 'No se pudo comprobar si hay actualizaciones.',
  'disabled-dev': 'Las actualizaciones automáticas están desactivadas en desarrollo local.',
};

const STATE_ICON: Record<UpdateState, IconName> = {
  idle: 'clock',
  checking: 'rotate-ccw',
  'up-to-date': 'check-circle',
  available: 'download',
  downloading: 'download',
  downloaded: 'check-circle',
  error: 'x',
  'disabled-dev': 'sliders',
};

function formatCheckedAt(iso: string | null | undefined): string {
  if (!iso) return 'Todavía no se ha comprobado.';
  return `Última comprobación: ${new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}`;
}

export function UpdatesSection() {
  const status = useUpdateStatus();
  const [checking, setChecking] = useState(false);

  if (!status) return null;

  const isDev = status.state === 'disabled-dev';
  const showVersionSuffix = status.availableVersion && status.state !== 'up-to-date' && status.state !== 'idle';

  const handleCheck = async () => {
    setChecking(true);
    try {
      await window.api.updates.check();
    } finally {
      setChecking(false);
    }
  };

  return (
    <section className={styles.section}>
      <h2>Actualizaciones</h2>

      <div className={styles.versionRow}>
        <span>Versión actual</span>
        <strong>v{status.currentVersion}</strong>
      </div>

      <div className={styles.statusRow}>
        <span className={styles.statusIcon} data-tone={status.state}>
          <Icon name={STATE_ICON[status.state]} size={16} />
        </span>
        <div className={styles.statusText}>
          <p>
            {STATE_LABEL[status.state]}
            {showVersionSuffix ? ` (v${status.availableVersion})` : ''}
          </p>
          {!isDev && <p className={styles.checkedAt}>{formatCheckedAt(status.lastCheckedAt)}</p>}
        </div>
      </div>

      {status.state === 'downloading' && (
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${status.percent ?? 0}%` }} />
        </div>
      )}

      {status.state === 'error' && status.error && <p className={styles.error}>{status.error}</p>}

      {status.availableVersion && (status.state === 'available' || status.state === 'downloading' || status.state === 'downloaded') && (
        <a
          className={styles.notesLink}
          href="#"
          onClick={(e) => {
            e.preventDefault();
            void window.api.system.openExternal(`${REPO_URL}/releases/tag/v${status.availableVersion}`);
          }}
        >
          Ver notas de la versión v{status.availableVersion}
          <Icon name="external-link" size={13} />
        </a>
      )}

      <div className={styles.actions}>
        <Button
          onClick={handleCheck}
          loading={checking || status.state === 'checking'}
          disabled={isDev || status.state === 'downloading'}
        >
          Buscar actualizaciones
        </Button>
        {status.state === 'downloaded' && (
          <Button variant="primary" onClick={() => void window.api.updates.install()}>
            Reiniciar e instalar
          </Button>
        )}
      </div>

      <p className={styles.hint}>
        Tus asignaturas, apuntes, notas, tareas y ajustes se guardan aparte y no se ven afectados al actualizar.
      </p>
    </section>
  );
}
