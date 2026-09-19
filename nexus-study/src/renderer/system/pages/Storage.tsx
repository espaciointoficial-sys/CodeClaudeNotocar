import { useEffect, useState } from 'react';
import type { SystemStorageUsage } from '@shared/types';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Spinner } from '../../components/ui/Spinner';
import { useToast } from '../../contexts/ToastContext';
import { formatFileSize, pluralize } from '../../lib/format';
import { useSystemMonitor, useSystemReport, useSystemSample } from '../SystemContext';
import { formatSpeed } from '../format';
import { AlertList, InfoList, SectionCard, UsageBar } from '../widgets';
import styles from '../System.module.css';

const LOW_SPACE_PERCENT = 90;

/** Traducción de lo que informa el sistema; si trae algo que no está aquí, se muestra tal cual. */
const DRIVE_TYPES: Record<string, string> = {
  Fixed: 'Unidad interna',
  Removable: 'Unidad extraíble',
  Network: 'Unidad de red',
  CDRom: 'Unidad óptica',
};

export function Storage() {
  const { snapshot } = useSystemMonitor();
  const { sample } = useSystemSample();
  const report = useSystemReport();
  const { showToast } = useToast();
  const [usage, setUsage] = useState<SystemStorageUsage | null>(null);

  // Calcular el tamaño obliga a recorrer la carpeta de datos, así que se hace al abrir la pantalla
  // y no en cada actualización: el dato cambia cuando importas documentos, no segundo a segundo.
  useEffect(() => {
    let cancelled = false;
    window.api.monitor.storageUsage().then(
      (value) => {
        if (!cancelled) setUsage(value);
      },
      () => {
        /* si no se puede calcular, la tarjeta se queda en su estado de carga */
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  if (!snapshot) return <Spinner />;

  const volumeByMount = new Map((report?.volumes ?? []).map((volume) => [volume.mount, volume]));

  const alerts = snapshot.disks
    .filter((disk) => disk.usagePercent >= LOW_SPACE_PERCENT)
    .map((disk) => ({
      id: disk.mount,
      text: `La unidad ${disk.mount} tiene poco espacio disponible. Revisa qué puedes mover o desinstalar; Nexus Study no borra nada por su cuenta.`,
    }));

  const openDataFolder = () => {
    window.api.monitor
      .runQuickAction('data-folder')
      .catch((error: Error) => showToast(error.message || 'No se ha podido abrir la carpeta.', 'error'));
  };

  return (
    <>
      <AlertList alerts={alerts} />

      <SectionCard
        icon="activity"
        title="Actividad ahora mismo"
        aside={sample?.disk.readBytesPerSecond == null ? 'No disponible' : undefined}
      >
        <InfoList
          rows={[
            ['Lectura', formatSpeed(sample?.disk.readBytesPerSecond)],
            ['Escritura', formatSpeed(sample?.disk.writeBytesPerSecond)],
          ]}
        />
      </SectionCard>

      {snapshot.disks.map((disk) => {
        const volume = volumeByMount.get(disk.mount);
        const kind = volume?.driveType ? (DRIVE_TYPES[volume.driveType] ?? volume.driveType) : null;
        return (
          <SectionCard
            key={disk.mount}
            icon="hard-drive"
            title={volume?.label ? `${disk.mount} · ${volume.label}` : disk.mount}
            aside={`${Math.round(disk.usagePercent)}% ocupado`}
          >
            <UsageBar percent={disk.usagePercent} />
            <InfoList
              rows={[
                ['Capacidad total', formatFileSize(disk.totalBytes)],
                ['En uso', formatFileSize(disk.usedBytes)],
                ['Libre', formatFileSize(disk.freeBytes)],
                ['Tipo de unidad', kind],
                ['Tipo de disco', volume?.mediaType],
                ['Conexión', volume?.busType],
                ['Modelo', volume?.model],
                ['Sistema de archivos', volume?.fileSystem],
              ]}
            />
            {!report && <p className={styles.caption}>Consultando los detalles de la unidad…</p>}
          </SectionCard>
        );
      })}

      <SectionCard icon="folder" title="Lo que ocupa Nexus Study">
        {!usage ? (
          <Spinner />
        ) : (
          <>
            <InfoList
              rows={[
                [
                  'Documentos importados',
                  `${formatFileSize(usage.documentsBytes)} · ${usage.documentCount} ${pluralize(usage.documentCount, 'archivo', 'archivos')}`,
                ],
                ['Base de datos', formatFileSize(usage.databaseBytes)],
                ['Caché y otros archivos', formatFileSize(usage.otherBytes)],
                ['Carpeta de datos', <code key="dir">{usage.dataDir}</code>],
              ]}
            />
            <div style={{ marginTop: 'var(--space-4)' }}>
              <Button onClick={openDataFolder} icon={<Icon name="external-link" size={15} />}>
                Abrir la carpeta de datos
              </Button>
            </div>
          </>
        )}
        <p className={styles.privacyNote}>
          Para calcular estos tamaños solo se consulta cuánto ocupa cada archivo, nunca su contenido. Nexus Study no
          borra ni comprime nada automáticamente: si hace falta liberar espacio, la decisión es tuya.
        </p>
      </SectionCard>
    </>
  );
}
