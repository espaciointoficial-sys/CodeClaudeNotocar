// Formateo propio del espacio Sistema. Separado de los componentes para que el refresco en
// caliente siga funcionando, y de lib/format.ts porque solo tiene sentido en este espacio.
import { formatFileSize } from '../lib/format';

/** Lo que se muestra cuando el sistema operativo sencillamente no ofrece ese dato. */
export const NOT_AVAILABLE = 'No disponible';
/** Lo que se muestra mientras todavía no hay dos lecturas que comparar. */
const PENDING = '—';

export function formatPercent(value: number | null | undefined): string {
  return value == null ? PENDING : `${Math.round(value)}%`;
}

export function formatSpeed(bytesPerSecond: number | null | undefined): string {
  return bytesPerSecond == null ? NOT_AVAILABLE : `${formatFileSize(Math.round(bytesPerSecond))}/s`;
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
}

/** El sistema informa la frecuencia en MHz; en GHz se lee mucho mejor. */
export function formatFrequency(mhz: number | null | undefined): string | null {
  return mhz ? `${(mhz / 1000).toFixed(2)} GHz` : null;
}

/** null cuando el sistema no sabe estimarlo, para poder omitir la frase en vez de escribir "0 min". */
export function formatRemaining(seconds: number | null): string | null {
  if (seconds === null || seconds <= 0) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}
