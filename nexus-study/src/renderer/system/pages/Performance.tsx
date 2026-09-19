import { useMemo } from 'react';
import { Spinner } from '../../components/ui/Spinner';
import { formatFileSize } from '../../lib/format';
import { useSystemMonitor, useSystemReport, useSystemSample } from '../SystemContext';
import { NOT_AVAILABLE, formatFrequency, formatPercent, formatSpeed } from '../format';
import { InfoList, SectionCard, Sparkline, Unavailable, UsageBar } from '../widgets';
import styles from '../System.module.css';

/** Uso de cada núcleo lógico. Sale de la misma lectura que el uso total, así que no cuesta nada. */
function CoreGrid({ values }: { values: number[] }) {
  return (
    <div className={styles.cores}>
      {values.map((value, index) => (
        <div key={index} className={styles.core}>
          <span className={styles.coreLabel}>
            <span>{index + 1}</span>
            <span>{Math.round(value)}%</span>
          </span>
          <UsageBar percent={value} />
        </div>
      ))}
    </div>
  );
}

export function Performance() {
  const { snapshot, history } = useSystemMonitor();
  const { sample, sampleHistory } = useSystemSample();
  const report = useSystemReport();

  const topMemory = useMemo(
    () => [...(sample?.processes ?? [])].sort((a, b) => b.memoryBytes - a.memoryBytes).slice(0, 6),
    [sample],
  );

  if (!snapshot) return <Spinner />;

  const gpu = report?.hardware.gpus[0];

  return (
    <>
      <SectionCard icon="cpu" title="Procesador" aside={formatPercent(snapshot.cpu.usagePercent)}>
        <UsageBar percent={snapshot.cpu.usagePercent ?? 0} />
        <Sparkline values={history.cpu} max={100} label="Uso de CPU reciente" />
        <InfoList
          rows={[
            ['Modelo', snapshot.info.cpuModel],
            ['Arquitectura', snapshot.info.arch],
            ['Núcleos físicos', report ? (report.hardware.cpuCores ?? NOT_AVAILABLE) : 'Consultando…'],
            ['Núcleos lógicos', snapshot.info.cpuCount],
            // Un solo dato de frecuencia: el sistema informa la nominal, no la que va variando.
            ['Frecuencia nominal', formatFrequency(report?.hardware.cpuMaxMhz ?? snapshot.info.cpuSpeedMhz)],
          ]}
        />
        <p className={styles.caption}>
          La frecuencia real sube y baja constantemente, pero Windows no la expone sin contadores privilegiados: lo que
          se muestra es la nominal del procesador.
        </p>
        {snapshot.cpu.perCorePercent && (
          <>
            <p className={styles.caption}>Uso por núcleo lógico</p>
            <CoreGrid values={snapshot.cpu.perCorePercent} />
          </>
        )}
      </SectionCard>

      <SectionCard icon="activity" title="Memoria" aside={formatPercent(snapshot.memory.usagePercent)}>
        <UsageBar percent={snapshot.memory.usagePercent} />
        <Sparkline values={history.memory} max={100} label="Uso de memoria reciente" />
        <InfoList
          rows={[
            ['Total', formatFileSize(snapshot.memory.totalBytes)],
            ['En uso', formatFileSize(snapshot.memory.usedBytes)],
            ['Disponible', formatFileSize(snapshot.memory.freeBytes)],
            ['Caché de archivos', sample?.memoryCacheBytes == null ? null : formatFileSize(sample.memoryCacheBytes)],
          ]}
        />
        <p className={styles.caption}>Procesos que más memoria usan</p>
        <dl className={styles.miniList}>
          {topMemory.length === 0 ? (
            <p className={styles.caption}>Midiendo…</p>
          ) : (
            topMemory.map((item) => (
              <div key={item.pid}>
                <dt className={styles.processName}>{item.name}</dt>
                <dd>{formatFileSize(item.memoryBytes)}</dd>
              </div>
            ))
          )}
        </dl>
      </SectionCard>

      <SectionCard
        icon="monitor"
        title="Gráfica"
        aside={sample?.gpu.usagePercent == null ? undefined : formatPercent(sample.gpu.usagePercent)}
      >
        {!report ? (
          <Spinner />
        ) : gpu ? (
          <>
            {sample?.gpu.usagePercent != null && (
              <>
                <UsageBar percent={sample.gpu.usagePercent} />
                <Sparkline values={sampleHistory.gpu} max={100} label="Uso de la gráfica reciente" />
              </>
            )}
            <InfoList
              rows={[
                ['Modelo', gpu.name],
                ['Controlador', gpu.driverVersion],
                ['Resolución actual', gpu.resolution],
                ['Frecuencia', gpu.refreshHz ? `${gpu.refreshHz} Hz` : null],
                [
                  'Memoria dedicada en uso',
                  sample?.gpu.dedicatedMemoryBytes == null ? null : formatFileSize(sample.gpu.dedicatedMemoryBytes),
                ],
              ]}
            />
          </>
        ) : (
          <Unavailable>
            Este sistema no ha informado de ninguna tarjeta gráfica. El resto del monitor funciona con normalidad.
          </Unavailable>
        )}
        <p className={styles.privacyNote}>
          La temperatura de CPU y GPU no se muestra porque leerla requiere permisos de administrador, y Nexus Study no
          los pide. Es preferible no enseñar el dato a enseñar uno inventado.
        </p>
      </SectionCard>

      <SectionCard icon="hard-drive" title="Discos">
        <InfoList
          rows={[
            ['Lectura', formatSpeed(sample?.disk.readBytesPerSecond)],
            ['Escritura', formatSpeed(sample?.disk.writeBytesPerSecond)],
          ]}
        />
        {sample?.disk.readBytesPerSecond == null ? (
          <p className={styles.caption}>Este sistema no expone contadores de actividad de disco.</p>
        ) : (
          <Sparkline values={sampleHistory.diskWrite} label="Escritura en disco reciente" />
        )}
        <div className={styles.diskList} style={{ marginTop: 'var(--space-4)' }}>
          {snapshot.disks.map((disk) => (
            <div key={disk.mount} className={styles.diskRow}>
              <span className={styles.diskName}>{disk.mount}</span>
              <span className={styles.diskValue}>{Math.round(disk.usagePercent)}% ocupado</span>
              <div className={styles.diskBar}>
                <UsageBar percent={disk.usagePercent} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
