import type { ReactNode } from 'react';
import type { UpdateState } from '@shared/types';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Spinner } from '../../components/ui/Spinner';
import { useToast } from '../../contexts/ToastContext';
import { useUpdateStatus } from '../../hooks/useUpdateStatus';
import { formatDateTime } from '../../lib/format';
import { useQuickActions, useSystemReport } from '../SystemContext';
import { InfoList, SectionCard, Unavailable } from '../widgets';
import styles from '../System.module.css';

type Status = 'ok' | 'warn' | 'unknown';

/** Fila de estado: un punto de color, la etiqueta y el valor. Sin alarmismo ni porcentajes falsos. */
function StatusRow({ state, label, value }: { state: Status; label: string; value: ReactNode }) {
  return (
    <div className={styles.statusRow}>
      <span className={styles.statusDot} data-state={state} />
      <span>{label}</span>
      <span className={styles.statusValue}>{value}</span>
    </div>
  );
}

const UPDATE_LABELS: Record<UpdateState, string> = {
  idle: 'Sin comprobar todavía',
  checking: 'Comprobando…',
  'up-to-date': 'Estás en la última versión',
  available: 'Hay una versión nueva',
  downloading: 'Descargando la actualización',
  downloaded: 'Lista para instalar',
  error: 'No se ha podido comprobar',
  'disabled-dev': 'Desactivado en modo desarrollo',
};

export function Security() {
  const report = useSystemReport();
  const actions = useQuickActions();
  const updates = useUpdateStatus();
  const { showToast } = useToast();

  const open = (id: string) => {
    window.api.monitor
      .runQuickAction(id)
      .catch((error: Error) => showToast(error.message || 'No se ha podido abrir la herramienta.', 'error'));
  };

  const available = (id: string) => actions?.some((action) => action.id === id) ?? false;

  return (
    <>
      <SectionCard icon="shield" title="Protección del sistema">
        {!report ? (
          <Spinner />
        ) : report.security.antivirus.length === 0 ? (
          <Unavailable>
            Este sistema no expone un centro de seguridad que Nexus Study pueda consultar sin permisos elevados. Abre la
            herramienta de seguridad de tu sistema para ver su estado real.
          </Unavailable>
        ) : (
          report.security.antivirus.map((item) => (
            <div key={item.name}>
              <StatusRow
                state={item.enabled === null ? 'unknown' : item.enabled ? 'ok' : 'warn'}
                label={item.name}
                value={item.enabled === null ? 'Estado desconocido' : item.enabled ? 'Activo' : 'Desactivado'}
              />
              <StatusRow
                state={item.upToDate === null ? 'unknown' : item.upToDate ? 'ok' : 'warn'}
                label="Definiciones"
                value={item.upToDate === null ? 'Estado desconocido' : item.upToDate ? 'Al día' : 'Anticuadas'}
              />
              {item.updatedAt && (
                <InfoList rows={[['Última comprobación del antivirus', formatDateTime(item.updatedAt)]]} />
              )}
            </div>
          ))
        )}
      </SectionCard>

      <SectionCard icon="wifi" title="Cortafuegos">
        {!report ? (
          <Spinner />
        ) : report.security.firewall.length === 0 ? (
          <Unavailable>El estado del cortafuegos no puede consultarse en este sistema.</Unavailable>
        ) : (
          report.security.firewall.map((profile) => (
            <StatusRow
              key={profile.profile}
              state={profile.enabled ? 'ok' : 'warn'}
              label={`Perfil ${profile.profile}`}
              value={profile.enabled ? 'Activado' : 'Desactivado'}
            />
          ))
        )}
      </SectionCard>

      <SectionCard icon="download" title="Actualizaciones de Nexus Study">
        {!updates ? (
          <Spinner />
        ) : (
          <InfoList
            rows={[
              ['Versión instalada', updates.currentVersion],
              ['Estado', UPDATE_LABELS[updates.state]],
              ['Versión disponible', updates.availableVersion],
              ['Última comprobación', updates.lastCheckedAt ? formatDateTime(updates.lastCheckedAt) : null],
            ]}
          />
        )}
        <p className={styles.caption}>
          Mantener el sistema y las aplicaciones al día es la medida de seguridad que más protege. Las actualizaciones
          de Windows se gestionan desde su propia herramienta.
        </p>
      </SectionCard>

      <SectionCard icon="external-link" title="Abrir las herramientas del sistema">
        <p className={styles.caption} style={{ marginTop: 0 }}>
          Nexus Study no analiza archivos, no simula protecciones ni cambia ninguna configuración de seguridad: solo
          muestra lo que el sistema ya informa y te lleva a sus herramientas.
        </p>
        <div className={styles.actionGrid} style={{ marginTop: 'var(--space-4)' }}>
          {available('security') && (
            <Button onClick={() => open('security')} icon={<Icon name="shield" size={15} />}>
              Seguridad del sistema
            </Button>
          )}
          {available('windows-update') && (
            <Button onClick={() => open('windows-update')} icon={<Icon name="download" size={15} />}>
              Actualizaciones del sistema
            </Button>
          )}
        </div>
        {!available('security') && !available('windows-update') && (
          <p className={styles.caption}>
            En este sistema operativo no hay herramientas de seguridad que se puedan abrir de forma estándar.
          </p>
        )}
      </SectionCard>
    </>
  );
}
