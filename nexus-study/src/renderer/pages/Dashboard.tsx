import { useEffect, useState } from 'react';
import type { AppSettings, HomeSummary, WeatherResult } from '@shared/types';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon, type IconName } from '../components/ui/Icon';
import { formatRelativeDay } from '../lib/format';
import { describeWeatherCode } from '../lib/weatherCodes';
import styles from './Dashboard.module.css';

// Se renderiza con key={city} desde Dashboard: un cambio de ciudad remonta el
// componente en vez de mutar el estado, así "loading" arranca en true de forma natural.
function WeatherCard({ city }: { city: string | null }) {
  const [result, setResult] = useState<WeatherResult | null>(null);
  const [loading, setLoading] = useState(Boolean(city));

  useEffect(() => {
    if (!city) return;
    window.api.weather.current(city).then((r) => {
      setResult(r);
      setLoading(false);
    });
  }, [city]);

  return (
    <section className={styles.card}>
      <h2>Tiempo</h2>
      {!city ? (
        <EmptyState
          icon="sliders"
          compact
          title="Sin ciudad configurada"
          description="Añade tu ciudad en Ajustes para ver el tiempo actual."
        />
      ) : loading ? (
        <p className={styles.muted}>Consultando el tiempo en {city}…</p>
      ) : result?.ok ? (
        <>
          <div className={styles.weather}>
            <span className={styles.weatherIcon}>{describeWeatherCode(result.weatherCode!).icon}</span>
            <div>
              <p className={styles.weatherTemp}>{result.temperature}°C</p>
              <p className={styles.muted}>{describeWeatherCode(result.weatherCode!).label}</p>
            </div>
          </div>
          <p className={styles.comingSoonText}>{result.cityLabel}</p>
        </>
      ) : (
        <p className={styles.muted}>{result?.error ?? 'No se pudo obtener el tiempo.'}</p>
      )}
    </section>
  );
}

function ComingSoonCard({ icon, name, url }: { icon: IconName; name: string; url: string }) {
  return (
    <section className={styles.card}>
      <div className={styles.comingSoonHead}>
        <span className={styles.comingSoonIcon}>
          <Icon name={icon} size={20} />
        </span>
        <div>
          <h2>{name}</h2>
          <span className={styles.badgeSoon}>Próxima integración</span>
        </div>
      </div>
      <p className={styles.comingSoonText}>
        La integración con {name} todavía no está disponible dentro de Nexus Study. Puedes abrirlo en tu navegador.
      </p>
      <button className={styles.externalLink} onClick={() => void window.api.system.openExternal(url)}>
        Abrir {name}
        <Icon name="external-link" size={14} />
      </button>
    </section>
  );
}

export function Dashboard() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [summary, setSummary] = useState<HomeSummary | null>(null);

  useEffect(() => {
    window.api.settings.get().then(setSettings);
    window.api.home.summary().then(setSummary);
  }, []);

  if (!settings || !summary) return null;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Widgets complementarios. Actívalos o desactívalos desde Ajustes."
      />
      <div className="page-body">
        <div className={styles.grid}>
          {settings.widgets.summary && (
            <section className={styles.card}>
              <h2>Resumen académico</h2>
              {summary.pendingTasks.length === 0 && summary.upcomingEvents.length === 0 ? (
                <EmptyState icon="check-circle" title="Todo al día" />
              ) : (
                <ul className={styles.summaryList}>
                  {summary.pendingTasks.slice(0, 4).map((task) => (
                    <li key={task.id}>
                      <Icon name="check-circle" size={14} />
                      {task.title}
                    </li>
                  ))}
                  {summary.upcomingEvents.slice(0, 4).map((event) => (
                    <li key={event.id}>
                      <Icon name="calendar" size={14} />
                      {event.title} · {formatRelativeDay(event.startAt)}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {settings.widgets.weather && <WeatherCard key={settings.weatherCity ?? 'none'} city={settings.weatherCity} />}

          {settings.widgets.gmail && <ComingSoonCard icon="mail" name="Gmail" url="https://mail.google.com" />}
          {settings.widgets.discord && <ComingSoonCard icon="message-circle" name="Discord" url="https://discord.com/app" />}
          {settings.widgets.pinterest && <ComingSoonCard icon="pin" name="Pinterest" url="https://www.pinterest.com" />}
        </div>
      </div>
    </div>
  );
}
