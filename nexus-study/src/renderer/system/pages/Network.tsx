import { useState } from 'react';
import type { SystemLatency } from '@shared/types';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Spinner } from '../../components/ui/Spinner';
import { formatFileSize } from '../../lib/format';
import { useSystemMonitor, useSystemReport } from '../SystemContext';
import { NOT_AVAILABLE, formatSpeed } from '../format';
import { InfoList, SectionCard, Sparkline } from '../widgets';
import styles from '../System.module.css';

const KIND_LABELS = { wifi: 'Wi-Fi', ethernet: 'Cable (Ethernet)', other: 'Otro tipo de adaptador' };

export function Network() {
  const { snapshot, history, online } = useSystemMonitor();
  const report = useSystemReport();
  const [latency, setLatency] = useState<SystemLatency | null>(null);
  const [measuring, setMeasuring] = useState(false);

  if (!snapshot) return <Spinner />;

  const { network } = snapshot;

  const measure = () => {
    setMeasuring(true);
    window.api.monitor
      .latency()
      .then(setLatency)
      .catch(() => setLatency({ target: 'puerta de enlace', averageMs: null, error: 'La medición no ha funcionado.' }))
      .finally(() => setMeasuring(false));
  };

  return (
    <>
      <SectionCard icon="wifi" title="Conexión" aside={online ? 'Con acceso a Internet' : 'Sin acceso a Internet'}>
        <p className={styles.metricValue}>{online ? 'Conectado' : 'Sin conexión'}</p>
        <InfoList
          rows={[
            ['Adaptador activo', network.interfaceName],
            ['Tipo de conexión', network.kind ? KIND_LABELS[network.kind] : null],
            ['Red Wi-Fi', report ? report.ssid : 'Consultando…'],
            ['Dirección en tu red', network.localIp],
            ['Puerta de enlace', report ? report.gateway : 'Consultando…'],
          ]}
        />
      </SectionCard>

      <div className={styles.grid}>
        <SectionCard icon="download" title="Bajada" aside={formatSpeed(network.downloadBytesPerSecond)}>
          <Sparkline values={history.download} label="Velocidad de bajada reciente" />
          <InfoList
            rows={[
              [
                'Recibido en esta sesión',
                network.sessionReceivedBytes == null ? null : formatFileSize(network.sessionReceivedBytes),
              ],
            ]}
          />
        </SectionCard>

        <SectionCard icon="activity" title="Subida" aside={formatSpeed(network.uploadBytesPerSecond)}>
          <Sparkline values={history.upload} label="Velocidad de subida reciente" />
          <InfoList
            rows={[
              ['Enviado en esta sesión', network.sessionSentBytes == null ? null : formatFileSize(network.sessionSentBytes)],
            ]}
          />
        </SectionCard>
      </div>

      <SectionCard icon="zap" title="Latencia">
        <p className={styles.caption} style={{ marginTop: 0 }}>
          Mide cuánto tarda en responder el router de tu red local. No se contacta con ningún servidor de Internet y no
          se envía ninguna información: por eso la medición es manual y no se repite sola.
        </p>
        <div style={{ marginTop: 'var(--space-3)' }}>
          <Button onClick={measure} loading={measuring} icon={<Icon name="refresh" size={15} />}>
            Medir latencia
          </Button>
        </div>
        {latency && (
          <InfoList
            rows={[
              ['Destino', latency.target],
              ['Respuesta media', latency.averageMs == null ? (latency.error ?? NOT_AVAILABLE) : `${latency.averageMs.toFixed(1)} ms`],
            ]}
          />
        )}
      </SectionCard>

      <SectionCard icon="shield" title="Qué no se muestra aquí">
        <p className={styles.caption} style={{ marginTop: 0 }}>
          Nexus Study no consulta las redes guardadas, las contraseñas del Wi-Fi ni los dispositivos conectados a tu
          red. Tu dirección local se muestra solo en esta pantalla y no sale del equipo.
        </p>
      </SectionCard>
    </>
  );
}
