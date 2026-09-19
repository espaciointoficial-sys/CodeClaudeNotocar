import { useMemo } from 'react';
import type { SystemProcess } from '@shared/types';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatFileSize } from '../../lib/format';
import { useSystemMonitor, useSystemSample } from '../SystemContext';
import { NOT_AVAILABLE, formatPercent, formatRemaining, formatSpeed, formatUptime } from '../format';
import { AlertList, InfoList, MetricCard, SectionCard, Sparkline, UsageBar } from '../widgets';
import styles from '../System.module.css';

/** Se avisa de la CPU solo si lleva un rato alta, no por un pico puntual de unos segundos. */
const CPU_ALERT_PERCENT = 85;
const CPU_ALERT_SAMPLES = 15;
const MEMORY_ALERT_PERCENT = 90;
const DISK_ALERT_PERCENT = 90;
const BATTERY_ALERT_LEVEL = 0.2;

function TopProcesses({ items, render }: { items: SystemProcess[]; render: (item: SystemProcess) => string }) {
  if (items.length === 0) return <p className={styles.caption}>Midiendo…</p>;
  return (
    <dl className={styles.miniList}>
      {items.map((item) => (
        <div key={item.pid}>
          <dt className={styles.processName}>{item.name}</dt>
          <dd>{render(item)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Overview() {
  const { snapshot, history, battery, online, failed } = useSystemMonitor();
  const { sample, sampleHistory } = useSystemSample();

  const cpuSustainedHigh = useMemo(() => {
    if (history.cpu.length < CPU_ALERT_SAMPLES) return false;
    const recent = history.cpu.slice(-CPU_ALERT_SAMPLES);
    return recent.reduce((total, value) => total + value, 0) / recent.length >= CPU_ALERT_PERCENT;
  }, [history.cpu]);

  const showBattery = snapshot !== null && snapshot.hasBattery !== false && battery !== null;

  const alerts = useMemo(() => {
    const found: { id: string; text: string }[] = [];
    if (!online) {
      found.push({ id: 'offline', text: 'No hay conexión a Internet. El tiempo y las actualizaciones no estarán disponibles.' });
    }
    if (!snapshot) return found;

    if (cpuSustainedHigh) {
      found.push({ id: 'cpu', text: 'La CPU lleva un rato trabajando al máximo. Es normal durante tareas pesadas.' });
    }
    if (snapshot.memory.usagePercent >= MEMORY_ALERT_PERCENT) {
      found.push({
        id: 'memory',
        text: 'El uso de memoria es elevado; quizá convenga cerrar aplicaciones que no estés utilizando.',
      });
    }
    for (const disk of snapshot.disks) {
      if (disk.usagePercent >= DISK_ALERT_PERCENT) {
        found.push({ id: `disk-${disk.mount}`, text: `El disco ${disk.mount} tiene poco espacio disponible.` });
      }
    }
    if (showBattery && battery && !battery.charging && battery.level <= BATTERY_ALERT_LEVEL) {
      found.push({ id: 'battery', text: 'La batería está baja. Conviene conectar el cargador para no perder el trabajo.' });
    }
    return found;
  }, [snapshot, battery, online, cpuSustainedHigh, showBattery]);

  const top = useMemo(() => {
    const list = sample?.processes ?? [];
    const byCpu = list.filter((item) => item.cpuPercent !== null);
    byCpu.sort((a, b) => (b.cpuPercent ?? 0) - (a.cpuPercent ?? 0));
    const byMemory = [...list].sort((a, b) => b.memoryBytes - a.memoryBytes);
    return { cpu: byCpu.slice(0, 5), memory: byMemory.slice(0, 5) };
  }, [sample]);

  if (failed && !snapshot) {
    return (
      <EmptyState
        icon="alert-triangle"
        title="No se pudieron leer los datos del sistema"
        description="Vuelve a intentarlo con el botón Actualizar. Nexus Study seguirá funcionando con normalidad."
      />
    );
  }
  if (!snapshot) return <Spinner />;

  const diskActivity =
    sample?.disk.readBytesPerSecond == null && sample?.disk.writeBytesPerSecond == null
      ? null
      : (sample?.disk.readBytesPerSecond ?? 0) + (sample?.disk.writeBytesPerSecond ?? 0);

  return (
    <>
      <AlertList alerts={alerts} />

      <div className={styles.grid}>
        <MetricCard
          icon="cpu"
          title="Procesador"
          value={formatPercent(snapshot.cpu.usagePercent)}
          percent={snapshot.cpu.usagePercent ?? 0}
          caption={`${snapshot.info.cpuModel} · ${snapshot.info.cpuCount} hilos`}
        >
          <Sparkline values={history.cpu} max={100} label="Uso de CPU reciente" />
        </MetricCard>

        <MetricCard
          icon="activity"
          title="Memoria"
          value={formatPercent(snapshot.memory.usagePercent)}
          percent={snapshot.memory.usagePercent}
          caption={`${formatFileSize(snapshot.memory.usedBytes)} de ${formatFileSize(snapshot.memory.totalBytes)} · ${formatFileSize(snapshot.memory.freeBytes)} disponibles`}
        >
          <Sparkline values={history.memory} max={100} label="Uso de memoria reciente" />
        </MetricCard>

        <MetricCard
          icon="monitor"
          title="Gráfica"
          value={sample?.gpu.usagePercent == null ? NOT_AVAILABLE : formatPercent(sample.gpu.usagePercent)}
          percent={sample?.gpu.usagePercent ?? undefined}
          caption={
            sample?.gpu.dedicatedMemoryBytes == null
              ? 'Memoria dedicada no disponible en este sistema.'
              : `${formatFileSize(sample.gpu.dedicatedMemoryBytes)} de memoria dedicada en uso`
          }
        >
          {sample?.gpu.usagePercent != null && (
            <Sparkline values={sampleHistory.gpu} max={100} label="Uso de la gráfica reciente" />
          )}
        </MetricCard>

        {showBattery && battery && (
          <MetricCard
            icon="battery"
            title="Batería"
            value={`${Math.round(battery.level * 100)}%`}
            percent={battery.level * 100}
            caption={[
              battery.charging ? 'Cargando' : 'Con batería',
              formatRemaining(battery.charging ? battery.chargingSecondsLeft : battery.dischargingSecondsLeft),
            ]
              .filter(Boolean)
              .join(' · ')}
          />
        )}

        <MetricCard
          icon="wifi"
          title="Red"
          value={online ? 'Conectado' : 'Sin conexión'}
          caption={snapshot.network.interfaceName ?? 'Adaptador no identificado'}
        >
          <InfoList
            rows={[
              ['Bajada', formatSpeed(snapshot.network.downloadBytesPerSecond)],
              ['Subida', formatSpeed(snapshot.network.uploadBytesPerSecond)],
            ]}
          />
        </MetricCard>

        <MetricCard
          icon="hard-drive"
          title="Actividad de disco"
          value={diskActivity === null ? NOT_AVAILABLE : formatSpeed(diskActivity)}
          caption={
            diskActivity === null
              ? 'Este sistema no expone contadores de disco.'
              : `Lectura ${formatSpeed(sample?.disk.readBytesPerSecond)} · Escritura ${formatSpeed(sample?.disk.writeBytesPerSecond)}`
          }
        >
          <Sparkline values={sampleHistory.diskRead} label="Lectura de disco reciente" />
        </MetricCard>
      </div>

      <div className={`${styles.grid} ${styles.gridWide}`}>
        <SectionCard icon="cpu" title="Más CPU">
          <TopProcesses items={top.cpu} render={(item) => formatPercent(item.cpuPercent)} />
        </SectionCard>
        <SectionCard icon="activity" title="Más memoria">
          <TopProcesses items={top.memory} render={(item) => formatFileSize(item.memoryBytes)} />
        </SectionCard>
      </div>

      <SectionCard icon="hard-drive" title="Almacenamiento">
        {snapshot.disks.length === 0 ? (
          <p className={styles.caption}>{NOT_AVAILABLE} en este equipo.</p>
        ) : (
          <div className={styles.diskList}>
            {snapshot.disks.map((disk) => (
              <div key={disk.mount} className={styles.diskRow}>
                <span className={styles.diskName}>{disk.mount}</span>
                <span className={styles.diskValue}>
                  {formatFileSize(disk.freeBytes)} libres de {formatFileSize(disk.totalBytes)}
                </span>
                <div className={styles.diskBar}>
                  <UsageBar percent={disk.usagePercent} />
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard icon="sliders" title="Este equipo">
        <InfoList
          rows={[
            ['Sistema operativo', snapshot.info.osName],
            ['Versión', snapshot.info.osRelease],
            ['Arquitectura', snapshot.info.arch],
            ['Nombre del equipo', snapshot.info.hostname],
            ['Encendido desde hace', formatUptime(snapshot.uptimeSeconds)],
          ]}
        />
        <p className={styles.privacyNote}>
          Estos datos se leen en tu ordenador y solo se muestran aquí. Nexus Study no los guarda ni los envía a ningún
          servicio.
        </p>
      </SectionCard>
    </>
  );
}
