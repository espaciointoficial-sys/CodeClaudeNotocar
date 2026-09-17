import { useEffect, useState } from 'react';
import type { AppSettings, WeatherResult } from '@shared/types';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { formatDateTime } from '../lib/format';
import { describeWeatherCode } from '../lib/weatherCodes';
import styles from './Weather.module.css';

export function Weather() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [cityDraft, setCityDraft] = useState('');
  const [result, setResult] = useState<WeatherResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const refresh = (city: string) => {
    if (!city) return;
    setLoading(true);
    window.api.weather.current(city).then((r) => {
      setResult(r);
      setLoading(false);
      setLastUpdatedAt(new Date().toISOString());
    });
  };

  useEffect(() => {
    window.api.settings.get().then((s) => {
      setSettings(s);
      setCityDraft(s.weatherCity ?? '');
      if (s.weatherCity) refresh(s.weatherCity);
    });
  }, []);

  const saveCity = async () => {
    const trimmed = cityDraft.trim();
    if (!settings || trimmed === (settings.weatherCity ?? '')) return;
    const next = trimmed || null;
    await window.api.settings.update({ weatherCity: next });
    setSettings({ ...settings, weatherCity: next });
    if (next) refresh(next);
    else setResult(null);
  };

  if (!settings) return null;

  return (
    <div>
      <PageHeader
        title="Tiempo"
        description={
          settings.weatherCity
            ? `${settings.weatherCity}${lastUpdatedAt ? ` · Actualizado ${formatDateTime(lastUpdatedAt)}` : ''}`
            : 'Añade tu ciudad para ver el tiempo actual.'
        }
        actions={
          settings.weatherCity ? (
            <Button onClick={() => refresh(settings.weatherCity!)} loading={loading}>
              <Icon name="refresh" size={15} />
              Actualizar
            </Button>
          ) : undefined
        }
      />
      <div className="page-body">
        <div className={styles.citySetting}>
          <input
            className="input"
            style={{ maxWidth: 280 }}
            placeholder="Ej. Madrid"
            value={cityDraft}
            onChange={(e) => setCityDraft(e.target.value)}
            onBlur={saveCity}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            aria-label="Ciudad para el tiempo"
          />
          <span className={styles.cityHint}>Servicio gratuito Open-Meteo; no requiere cuenta.</span>
        </div>

        {!settings.weatherCity ? (
          <EmptyState
            icon="sun"
            title="Sin ciudad configurada"
            description="Escribe una ciudad arriba para ver la temperatura y el estado del cielo."
          />
        ) : loading && !result ? (
          <p className={styles.muted}>Consultando el tiempo en {settings.weatherCity}…</p>
        ) : result?.ok ? (
          <section className={styles.card}>
            <span className={styles.bigIcon}>{describeWeatherCode(result.weatherCode!).icon}</span>
            <div className={styles.info}>
              <p className={styles.temp}>{result.temperature}°C</p>
              <p className={styles.label}>{describeWeatherCode(result.weatherCode!).label}</p>
              <p className={styles.muted}>{result.cityLabel}</p>
            </div>
          </section>
        ) : (
          <EmptyState icon="x" title="No se pudo obtener el tiempo" description={result?.error ?? 'Inténtalo de nuevo en unos minutos.'} />
        )}
      </div>
    </div>
  );
}
