import { Spinner } from '../../components/ui/Spinner';
import { formatFileSize } from '../../lib/format';
import { useSystemMonitor, useSystemReport } from '../SystemContext';
import { formatFrequency, formatUptime } from '../format';
import { InfoList, SectionCard, Unavailable } from '../widgets';
import styles from '../System.module.css';

export function Hardware() {
  const { snapshot } = useSystemMonitor();
  const report = useSystemReport();

  if (!snapshot) return <Spinner />;

  const hardware = report?.hardware;
  const totalModules = hardware?.memoryModules.reduce((total, module) => total + module.capacityBytes, 0) ?? 0;

  return (
    <>
      <SectionCard icon="sliders" title="Sistema">
        <InfoList
          rows={[
            ['Sistema operativo', snapshot.info.osName],
            ['Versión', snapshot.info.osRelease],
            ['Arquitectura', snapshot.info.arch],
            ['Nombre del equipo', snapshot.info.hostname],
            ['Encendido desde hace', formatUptime(snapshot.uptimeSeconds)],
          ]}
        />
      </SectionCard>

      <SectionCard icon="cpu" title="Equipo y placa">
        {!report ? (
          <Spinner />
        ) : (
          <InfoList
            rows={[
              ['Fabricante', hardware?.manufacturer],
              ['Modelo', hardware?.model],
              ['Placa base', hardware?.baseboard],
              ['BIOS / UEFI', hardware?.bios],
            ]}
          />
        )}
      </SectionCard>

      <SectionCard icon="cpu" title="Procesador">
        <InfoList
          rows={[
            ['Modelo', snapshot.info.cpuModel],
            ['Núcleos físicos', report ? hardware?.cpuCores : 'Consultando…'],
            ['Núcleos lógicos', snapshot.info.cpuCount],
            ['Frecuencia nominal', formatFrequency(hardware?.cpuMaxMhz ?? snapshot.info.cpuSpeedMhz)],
          ]}
        />
      </SectionCard>

      <SectionCard icon="activity" title="Memoria" aside={formatFileSize(snapshot.memory.totalBytes)}>
        {!report ? (
          <Spinner />
        ) : hardware && hardware.memoryModules.length > 0 ? (
          <>
            <InfoList
              rows={hardware.memoryModules.map((module, index) => [
                `Módulo ${index + 1}`,
                [
                  formatFileSize(module.capacityBytes),
                  module.speedMhz ? `${module.speedMhz} MT/s` : null,
                  module.manufacturer,
                ]
                  .filter(Boolean)
                  .join(' · '),
              ])}
            />
            <p className={styles.caption}>
              {hardware.memoryModules.length} módulos · {formatFileSize(totalModules)} instalados
            </p>
          </>
        ) : (
          <Unavailable>
            Este sistema no informa del detalle de los módulos de memoria. La capacidad total sí se muestra arriba.
          </Unavailable>
        )}
      </SectionCard>

      <SectionCard icon="monitor" title="Gráfica">
        {!report ? (
          <Spinner />
        ) : hardware && hardware.gpus.length > 0 ? (
          hardware.gpus.map((gpu) => (
            <InfoList
              key={gpu.name}
              rows={[
                ['Modelo', gpu.name],
                ['Controlador', gpu.driverVersion],
                ['Resolución', gpu.resolution],
                ['Frecuencia', gpu.refreshHz ? `${gpu.refreshHz} Hz` : null],
              ]}
            />
          ))
        ) : (
          <Unavailable>Este sistema no ha informado de ninguna tarjeta gráfica.</Unavailable>
        )}
      </SectionCard>

      <SectionCard icon="hard-drive" title="Discos">
        {report && report.volumes.length > 0 ? (
          <InfoList
            rows={report.volumes.map((volume) => [
              volume.label ? `${volume.mount} (${volume.label})` : volume.mount,
              [volume.model, volume.mediaType, volume.busType, volume.fileSystem].filter(Boolean).join(' · '),
            ])}
          />
        ) : (
          <InfoList
            rows={snapshot.disks.map((disk) => [disk.mount, `${formatFileSize(disk.totalBytes)} de capacidad`])}
          />
        )}
      </SectionCard>

      <SectionCard icon="monitor" title="Pantallas">
        {!report ? (
          <Spinner />
        ) : hardware && hardware.displays.length > 0 ? (
          <InfoList
            rows={hardware.displays.map((display, index) => [
              display.primary ? `Pantalla ${index + 1} (principal)` : `Pantalla ${index + 1}`,
              [
                `${display.width} × ${display.height}`,
                display.refreshRate ? `${display.refreshRate} Hz` : null,
                display.scaleFactor !== 1 ? `escala ${Math.round(display.scaleFactor * 100)}%` : null,
              ]
                .filter(Boolean)
                .join(' · '),
            ])}
          />
        ) : (
          <Unavailable>No se ha podido enumerar las pantallas conectadas.</Unavailable>
        )}
      </SectionCard>

      <SectionCard icon="activity" title="Audio">
        {!report ? (
          <Spinner />
        ) : hardware && hardware.audioDevices.length > 0 ? (
          <div className={styles.tagList}>
            {hardware.audioDevices.map((device) => (
              <span key={device} className={styles.tag}>
                {device}
              </span>
            ))}
          </div>
        ) : (
          <Unavailable>Este sistema no expone la lista de dispositivos de audio.</Unavailable>
        )}
      </SectionCard>

      {report && report.notes.length > 0 && (
        <SectionCard icon="alert-triangle" title="Qué no se ha podido leer">
          {report.notes.map((note) => (
            <p key={note} className={styles.caption}>
              {note}
            </p>
          ))}
        </SectionCard>
      )}
    </>
  );
}
