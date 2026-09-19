import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { BatteryStatus, SystemQuickAction, SystemReport, SystemSample, SystemSnapshot } from '@shared/types';

/**
 * Único punto donde el espacio Sistema consulta al proceso principal.
 *
 * Todas las pantallas leen de aquí en vez de sondear por su cuenta, y así no hay dos temporizadores
 * pidiendo lo mismo ni intervalos que sobrevivan a un cambio de pantalla: cuando el proveedor deja
 * de estar activo, los `useEffect` limpian sus intervalos y el coste vuelve a cero.
 *
 * Las métricas están separadas en dos ritmos porque cuestan cosas muy distintas:
 *   · snapshot — CPU, memoria, discos y red. Solo APIs de Node, ~1 ms. Va al ritmo elegido.
 *   · sample   — procesos, actividad de disco y GPU. Obliga a lanzar una utilidad del sistema
 *                (~500 ms en Windows), así que va más despacio y solo mientras alguna pantalla
 *                declare que lo necesita, con useSystemSample().
 */

/** Cadencias que se pueden elegir en Ajustes del sistema. 0 = actualización manual. */
export const REFRESH_OPTIONS = [1000, 2000, 3000, 0];
const DEFAULT_REFRESH_MS = 2000;
const STORAGE_KEY = 'nexus.system.refreshMs';

/** Una ventana más larga para las métricas caras: pesan más y sus porcentajes salen más estables. */
const SAMPLE_INTERVAL_FACTOR = 2.5;
/** Sin foco el panel sigue vivo, pero no hace falta mirarlo de cerca. */
const BLURRED_FACTOR = 3;
/** Unos dos minutos de historial a la cadencia por defecto. */
const HISTORY_SIZE = 60;

export interface SystemHistory {
  cpu: number[];
  memory: number[];
  download: number[];
  upload: number[];
  battery: number[];
}

export interface SampleHistory {
  diskRead: number[];
  diskWrite: number[];
  gpu: number[];
}

const EMPTY_HISTORY: SystemHistory = { cpu: [], memory: [], download: [], upload: [], battery: [] };
const EMPTY_SAMPLE_HISTORY: SampleHistory = { diskRead: [], diskWrite: [], gpu: [] };

/** Añade un punto al historial descartando el más antiguo. Los valores no disponibles no entran. */
function push(series: number[], value: number | null | undefined): number[] {
  if (value == null || !Number.isFinite(value)) return series;
  const next = series.length >= HISTORY_SIZE ? series.slice(1) : series.slice();
  next.push(value);
  return next;
}

function readStoredRefresh(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    // Sin preferencia guardada hay que salir aquí: Number(null) vale 0, que además es una opción
    // válida (la manual), así que convertir sin comprobar dejaría el monitor en pausa de inicio.
    if (stored === null) return DEFAULT_REFRESH_MS;
    const parsed = Number(stored);
    return REFRESH_OPTIONS.includes(parsed) ? parsed : DEFAULT_REFRESH_MS;
  } catch {
    return DEFAULT_REFRESH_MS;
  }
}

interface SystemMonitorValue {
  snapshot: SystemSnapshot | null;
  history: SystemHistory;
  battery: BatteryStatus | null;
  online: boolean;
  failed: boolean;
  /** null = no se está consultando nada (ventana oculta, fuera del espacio o pausa manual). */
  intervalMs: number | null;
  refreshMs: number;
  setRefreshMs: (value: number) => void;
  refresh: () => void;
  sample: SystemSample | null;
  sampleHistory: SampleHistory;
  /** Declara que la pantalla montada necesita las métricas caras; devuelve la baja. */
  requestSample: () => () => void;
}

const SystemMonitorContext = createContext<SystemMonitorValue | null>(null);

interface BatteryManagerLike extends EventTarget {
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
}

type NavigatorWithBattery = Navigator & { getBattery?: () => Promise<BatteryManagerLike> };

function finiteOrNull(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

export function SystemMonitorProvider({ active, children }: { active: boolean; children: ReactNode }) {
  const [refreshMs, setRefreshMsState] = useState(readStoredRefresh);
  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null);
  const [sample, setSample] = useState<SystemSample | null>(null);
  const [history, setHistory] = useState<SystemHistory>(EMPTY_HISTORY);
  const [sampleHistory, setSampleHistory] = useState<SampleHistory>(EMPTY_SAMPLE_HISTORY);
  const [battery, setBattery] = useState<BatteryStatus | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [failed, setFailed] = useState(false);
  const [manualToken, setManualToken] = useState(0);
  const [sampleConsumers, setSampleConsumers] = useState(0);

  // La ventana oculta (minimizada o en otro escritorio) no necesita datos; sin foco basta con
  // refrescar más despacio, para que el panel siga vivo si se deja a un lado sin gastar CPU.
  const [windowState, setWindowState] = useState(() => ({
    visible: document.visibilityState === 'visible',
    focused: document.hasFocus(),
  }));

  useEffect(() => {
    const sync = () => setWindowState({ visible: document.visibilityState === 'visible', focused: document.hasFocus() });
    window.addEventListener('focus', sync);
    window.addEventListener('blur', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.removeEventListener('focus', sync);
      window.removeEventListener('blur', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  // La batería no se sondea: el navegador avisa cuando cambia alguno de sus valores.
  useEffect(() => {
    const getBattery = (navigator as NavigatorWithBattery).getBattery;
    if (!getBattery) return;
    let manager: BatteryManagerLike | null = null;
    let cancelled = false;
    const sync = () => {
      if (!manager) return;
      const level = manager.level;
      setBattery({
        level,
        charging: manager.charging,
        chargingSecondsLeft: finiteOrNull(manager.chargingTime),
        dischargingSecondsLeft: finiteOrNull(manager.dischargingTime),
      });
      // El historial se apunta aquí, donde el navegador avisa de un cambio real, en vez de en cada
      // tic del monitor: así refleja la evolución de la carga y no repite el mismo valor.
      setHistory((current) => ({ ...current, battery: push(current.battery, level * 100) }));
    };
    const events = ['levelchange', 'chargingchange', 'chargingtimechange', 'dischargingtimechange'];
    void getBattery.call(navigator).then((loaded) => {
      if (cancelled) return;
      manager = loaded;
      sync();
      events.forEach((event) => loaded.addEventListener(event, sync));
    });
    return () => {
      cancelled = true;
      events.forEach((event) => manager?.removeEventListener(event, sync));
    };
  }, []);

  const paused = !active || !windowState.visible || refreshMs === 0;
  const intervalMs = paused ? null : windowState.focused ? refreshMs : refreshMs * BLURRED_FACTOR;
  const wantsSample = sampleConsumers > 0;

  useEffect(() => {
    if (intervalMs === null) return;
    let cancelled = false;
    const tick = () => {
      window.api.monitor
        .snapshot()
        .then((next) => {
          if (cancelled) return;
          setSnapshot(next);
          setFailed(false);
          setHistory((current) => ({
            ...current,
            cpu: push(current.cpu, next.cpu.usagePercent),
            memory: push(current.memory, next.memory.usagePercent),
            download: push(current.download, next.network.downloadBytesPerSecond),
            upload: push(current.upload, next.network.uploadBytesPerSecond),
          }));
        })
        .catch(() => {
          if (!cancelled) setFailed(true);
        });
    };
    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs, manualToken]);

  useEffect(() => {
    if (intervalMs === null || !wantsSample) return;
    let cancelled = false;
    const tick = () => {
      window.api.monitor.sample().then((next) => {
        if (cancelled) return;
        setSample(next);
        setSampleHistory((current) => ({
          diskRead: push(current.diskRead, next.disk.readBytesPerSecond),
          diskWrite: push(current.diskWrite, next.disk.writeBytesPerSecond),
          gpu: push(current.gpu, next.gpu.usagePercent),
        }));
      });
    };
    tick();
    const id = setInterval(tick, Math.round(intervalMs * SAMPLE_INTERVAL_FACTOR));
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs, wantsSample, manualToken]);

  const requestSample = useCallback(() => {
    setSampleConsumers((count) => count + 1);
    return () => setSampleConsumers((count) => Math.max(0, count - 1));
  }, []);

  const setRefreshMs = useCallback((value: number) => {
    setRefreshMsState(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      /* almacenamiento no disponible: la preferencia simplemente no persiste */
    }
  }, []);

  const refresh = useCallback(() => setManualToken((token) => token + 1), []);

  const value = useMemo<SystemMonitorValue>(
    () => ({
      snapshot,
      history,
      battery,
      online,
      failed,
      intervalMs,
      refreshMs,
      setRefreshMs,
      refresh,
      sample,
      sampleHistory,
      requestSample,
    }),
    [snapshot, history, battery, online, failed, intervalMs, refreshMs, setRefreshMs, refresh, sample, sampleHistory, requestSample],
  );

  return <SystemMonitorContext.Provider value={value}>{children}</SystemMonitorContext.Provider>;
}

export function useSystemMonitor(): SystemMonitorValue {
  const value = useContext(SystemMonitorContext);
  if (!value) throw new Error('useSystemMonitor debe usarse dentro de SystemMonitorProvider');
  return value;
}

/**
 * Para pantallas que muestran procesos, actividad de disco o GPU. Mientras el componente esté
 * montado el proveedor consulta esas métricas; al desmontarse deja de hacerlo automáticamente.
 */
export function useSystemSample(): { sample: SystemSample | null; sampleHistory: SampleHistory } {
  const { requestSample, sample, sampleHistory } = useSystemMonitor();
  useEffect(() => requestSample(), [requestSample]);
  return { sample, sampleHistory };
}

// El informe del equipo no cambia mientras la aplicación está abierta y reunirlo tarda unos
// segundos, así que la promesa se guarda en el módulo: la primera pantalla que lo pide paga la
// espera y las demás lo reciben ya resuelto, incluso después de cambiar de espacio y volver.
let reportRequest: Promise<SystemReport> | null = null;

export function useSystemReport(): SystemReport | null {
  const [report, setReport] = useState<SystemReport | null>(null);
  useEffect(() => {
    let cancelled = false;
    reportRequest ??= window.api.monitor.report();
    reportRequest.then(
      (value) => {
        if (!cancelled) setReport(value);
      },
      () => {
        // El proceso principal ya devuelve un informe vacío si algo falla; si ni eso llega, la
        // pantalla se queda en su estado de carga y el resto del monitor sigue funcionando.
        reportRequest = null;
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);
  return report;
}

// La lista de acciones depende solo del sistema operativo, así que tampoco cambia nunca.
let actionsRequest: Promise<SystemQuickAction[]> | null = null;

export function useQuickActions(): SystemQuickAction[] | null {
  const [actions, setActions] = useState<SystemQuickAction[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    actionsRequest ??= window.api.monitor.quickActions();
    actionsRequest.then(
      (value) => {
        if (!cancelled) setActions(value);
      },
      () => {
        actionsRequest = null;
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);
  return actions;
}
