import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { useSystemMonitor } from '../SystemContext';
import { formatRemaining } from '../format';
import { InfoList, SectionCard, Sparkline, Unavailable, UsageBar } from '../widgets';
import styles from '../System.module.css';

export function Battery() {
  const { snapshot, battery, history } = useSystemMonitor();

  if (!snapshot) return <Spinner />;

  // navigator.getBattery() finge una batería llena en equipos de sobremesa, así que se comprueba
  // también lo que ha detectado el proceso principal antes de dar nada por válido.
  if (snapshot.hasBattery === false || !battery) {
    return (
      <EmptyState
        icon="battery"
        title="Este equipo no tiene batería"
        description="Es un equipo de sobremesa o el sistema no informa de ninguna batería interna."
      />
    );
  }

  const percent = battery.level * 100;
  const remaining = formatRemaining(battery.charging ? battery.chargingSecondsLeft : battery.dischargingSecondsLeft);

  return (
    <>
      <SectionCard icon="battery" title="Nivel actual" aside={battery.charging ? 'Cargando' : 'Con batería'}>
        <p className={styles.metricValue}>{Math.round(percent)}%</p>
        <UsageBar percent={percent} />
        <InfoList
          rows={[
            ['Estado', battery.charging ? 'Conectado a la corriente' : 'Funcionando con batería'],
            [battery.charging ? 'Carga completa en' : 'Autonomía estimada', remaining],
          ]}
        />
      </SectionCard>

      <SectionCard icon="activity" title="Evolución reciente">
        {history.battery.length < 2 ? (
          <p className={styles.caption} style={{ marginTop: 0 }}>
            El historial se va formando a medida que cambia el nivel de carga, así que al principio está vacío.
          </p>
        ) : (
          <Sparkline values={history.battery} max={100} label="Nivel de batería reciente" />
        )}
      </SectionCard>

      <SectionCard icon="alert-triangle" title="Salud y ciclos de carga">
        <Unavailable>
          El desgaste de la batería y su número de ciclos no se muestran porque este sistema no los ofrece de forma
          fiable sin generar un informe aparte. Preferimos no enseñar un dato antes que enseñar uno aproximado que
          parezca exacto.
        </Unavailable>
      </SectionCard>
    </>
  );
}
