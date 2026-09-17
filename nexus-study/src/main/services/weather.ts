import type { WeatherResult } from '../../shared/types.ts';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const REQUEST_TIMEOUT_MS = 6000;

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

/** Obtiene el tiempo actual para una ciudad usando Open-Meteo (gratis, sin clave ni login). */
export async function fetchWeather(city: string): Promise<WeatherResult> {
  const trimmed = city.trim();
  if (!trimmed) return { ok: false, error: 'Configura una ciudad en Ajustes.' };

  try {
    const geocoding = (await fetchJson(
      `${GEOCODING_URL}?name=${encodeURIComponent(trimmed)}&count=1&language=es`,
    )) as { results?: { latitude: number; longitude: number; name: string; country?: string }[] };

    const place = geocoding.results?.[0];
    if (!place) return { ok: false, error: `No se encontró la ciudad "${trimmed}".` };

    const forecast = (await fetchJson(
      `${FORECAST_URL}?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code&timezone=auto`,
    )) as { current?: { temperature_2m: number; weather_code: number } };

    if (!forecast.current) return { ok: false, error: 'El servicio de tiempo no devolvió datos.' };

    return {
      ok: true,
      cityLabel: place.country ? `${place.name}, ${place.country}` : place.name,
      temperature: Math.round(forecast.current.temperature_2m),
      weatherCode: forecast.current.weather_code,
    };
  } catch {
    return { ok: false, error: 'No se pudo conectar con el servicio de tiempo. Comprueba tu conexión a Internet.' };
  }
}
