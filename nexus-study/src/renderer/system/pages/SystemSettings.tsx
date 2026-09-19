import { REFRESH_OPTIONS, useSystemMonitor } from '../SystemContext';
import { InfoList, SectionCard } from '../widgets';
import styles from '../System.module.css';

const LABELS: Record<number, { label: string; hint: string }> = {
  1000: { label: 'Cada segundo', hint: 'Más detalle, algo más de consumo' },
  2000: { label: 'Cada 2 segundos', hint: 'Recomendado' },
  3000: { label: 'Cada 3 segundos', hint: 'Más suave con el equipo' },
  0: { label: 'Solo al pulsar Actualizar', hint: 'Sin consultas automáticas' },
};

export function SystemSettings() {
  const { refreshMs, setRefreshMs, intervalMs } = useSystemMonitor();

  return (
    <>
      <SectionCard icon="refresh" title="Frecuencia de actualización">
        <p className={styles.caption} style={{ marginTop: 0, marginBottom: 'var(--space-3)' }}>
          Con qué frecuencia se leen CPU, memoria y red mientras esta ventana está en primer plano. Los datos más caros
          —procesos, disco y gráfica— se consultan más despacio, y todo se detiene solo al minimizar la ventana o al
          salir del espacio Sistema.
        </p>
        <div className={styles.choiceList}>
          {REFRESH_OPTIONS.map((value) => (
            <button
              key={value}
              className={styles.choice}
              data-active={refreshMs === value}
              onClick={() => setRefreshMs(value)}
            >
              {LABELS[value]?.label}
              <span className={styles.choiceHint}>{LABELS[value]?.hint}</span>
            </button>
          ))}
        </div>
        <InfoList
          rows={[
            [
              'Ahora mismo',
              intervalMs === null ? 'Las actualizaciones están detenidas' : `Leyendo cada ${(intervalMs / 1000).toFixed(0)} s`,
            ],
          ]}
        />
      </SectionCard>

      <SectionCard icon="shield" title="Qué consulta este monitor">
        <p className={styles.caption} style={{ marginTop: 0 }}>
          Todo lo que ves en este espacio se lee en tu ordenador con las herramientas que el propio sistema operativo
          ofrece, y se queda en la pantalla: no se guarda en disco ni se envía a ningún servidor. No se leen tus
          archivos, ni el historial del navegador, ni contraseñas, ni el contenido de tus documentos, ni se toman
          capturas ni se registran pulsaciones de teclado. Nexus Study tampoco pide permisos de administrador.
        </p>
        <p className={styles.privacyNote}>
          Esto es un panel de estado de tu propio equipo, no una herramienta de vigilancia ni de control remoto: nadie
          más puede ver estos datos.
        </p>
      </SectionCard>
    </>
  );
}
