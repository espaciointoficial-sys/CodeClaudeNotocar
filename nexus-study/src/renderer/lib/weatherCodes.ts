// Códigos WMO que devuelve Open-Meteo → icono y etiqueta en español.
// https://open-meteo.com/en/docs (campo weather_code)
const WEATHER_CODE_MAP: Record<number, { icon: string; label: string }> = {
  0: { icon: '☀️', label: 'Cielo despejado' },
  1: { icon: '🌤️', label: 'Mayormente despejado' },
  2: { icon: '⛅', label: 'Parcialmente nublado' },
  3: { icon: '☁️', label: 'Nublado' },
  45: { icon: '🌫️', label: 'Niebla' },
  48: { icon: '🌫️', label: 'Niebla helada' },
  51: { icon: '🌦️', label: 'Llovizna ligera' },
  53: { icon: '🌦️', label: 'Llovizna' },
  55: { icon: '🌦️', label: 'Llovizna densa' },
  56: { icon: '🌧️', label: 'Llovizna helada' },
  57: { icon: '🌧️', label: 'Llovizna helada densa' },
  61: { icon: '🌦️', label: 'Lluvia ligera' },
  63: { icon: '🌧️', label: 'Lluvia' },
  65: { icon: '🌧️', label: 'Lluvia intensa' },
  66: { icon: '🌧️', label: 'Lluvia helada' },
  67: { icon: '🌧️', label: 'Lluvia helada intensa' },
  71: { icon: '🌨️', label: 'Nieve ligera' },
  73: { icon: '🌨️', label: 'Nieve' },
  75: { icon: '🌨️', label: 'Nieve intensa' },
  77: { icon: '🌨️', label: 'Granos de nieve' },
  80: { icon: '🌦️', label: 'Chubascos ligeros' },
  81: { icon: '🌧️', label: 'Chubascos' },
  82: { icon: '🌧️', label: 'Chubascos violentos' },
  85: { icon: '🌨️', label: 'Chubascos de nieve' },
  86: { icon: '🌨️', label: 'Chubascos de nieve intensos' },
  95: { icon: '⛈️', label: 'Tormenta' },
  96: { icon: '⛈️', label: 'Tormenta con granizo' },
  99: { icon: '⛈️', label: 'Tormenta con granizo intenso' },
};

export function describeWeatherCode(code: number): { icon: string; label: string } {
  return WEATHER_CODE_MAP[code] ?? { icon: '🌡️', label: 'Sin descripción' };
}
