// Monitor local del equipo: métricas que cambian mientras la aplicación está abierta.
//
// Privacidad: todo se lee en este ordenador y viaja únicamente del proceso principal al renderer
// por IPC. Nada se guarda en disco ni se envía a ningún servicio externo. No se leen archivos del
// usuario, ni historial, ni credenciales: solo contadores agregados del sistema operativo.
//
// Coste: no hay ningún temporizador aquí. El proceso principal solo trabaja cuando el renderer
// pide una muestra, de modo que al cerrar el espacio Sistema el coste vuelve a cero por sí solo.
// Las métricas están separadas en dos funciones según lo que cuestan:
//   · getSystemSnapshot — solo APIs de Node, ~1 ms.
//   · getSystemSample   — obliga a lanzar una utilidad del sistema, ~500 ms en Windows.
// Así cada pantalla pide solo lo que muestra, al ritmo que ese dato se puede permitir.
//
// Este módulo no importa Electron a propósito: así sus analizadores pueden probarse con node:test.
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import { promisify } from 'node:util';
import type {
  NetworkKind,
  SystemCpu,
  SystemDisk,
  SystemInfo,
  SystemNetwork,
  SystemProcess,
  SystemSample,
  SystemSnapshot,
} from '@shared/types';

const execFileAsync = promisify(execFile);

// timeout evita que una utilidad del sistema colgada deje el proceso vivo indefinidamente.
const EXEC_OPTIONS = { windowsHide: true, timeout: 8000, maxBuffer: 24 * 1024 * 1024 };

/** Los contadores de rendimiento de Windows cuentan en unidades de 100 ns. */
const WINDOWS_TICKS_PER_SECOND = 1e7;

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

// ---- Información estática ----

let cachedInfo: SystemInfo | null = null;

function readInfo(): SystemInfo {
  if (!cachedInfo) {
    const cpus = os.cpus();
    const speed = cpus[0]?.speed ?? 0;
    cachedInfo = {
      osName: os.version(),
      osRelease: os.release(),
      arch: os.arch(),
      hostname: os.hostname(),
      cpuModel: cpus[0]?.model.trim() || 'Desconocido',
      cpuCount: cpus.length,
      cpuSpeedMhz: speed > 0 ? speed : null,
    };
  }
  return cachedInfo;
}

// ---- CPU ----
// os.cpus() devuelve tiempos acumulados por núcleo. El porcentaje de uso solo tiene sentido como
// diferencia entre dos lecturas, así que se guarda la anterior entre llamadas. El uso por núcleo
// sale de la misma lectura, sin coste añadido.

interface CoreTimes {
  idle: number;
  total: number;
}

function coreTimes(): CoreTimes[] {
  return os.cpus().map((cpu) => ({
    idle: cpu.times.idle,
    total: cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq,
  }));
}

let previousCores = coreTimes();

function readCpu(): SystemCpu {
  const current = coreTimes();
  const perCorePercent: number[] = [];
  let idleDelta = 0;
  let totalDelta = 0;

  for (const [index, now] of current.entries()) {
    const before = previousCores[index];
    if (!before) continue;
    const total = now.total - before.total;
    const idle = now.idle - before.idle;
    totalDelta += total;
    idleDelta += idle;
    perCorePercent.push(total > 0 ? clampPercent(((total - idle) / total) * 100) : 0);
  }
  previousCores = current;

  if (totalDelta <= 0) return { usagePercent: null, perCorePercent: null };
  return {
    usagePercent: clampPercent(((totalDelta - idleDelta) / totalDelta) * 100),
    perCorePercent,
  };
}

// ---- Almacenamiento ----
// Las unidades presentes se descubren una sola vez: recorrer las 26 letras en cada muestra sería
// gratis en disco local pero puede bloquearse varios segundos con unidades de red desconectadas.

let cachedDiskRoots: string[] | null = null;

async function discoverDiskRoots(): Promise<string[]> {
  if (process.platform !== 'win32') return ['/'];
  const roots: string[] = [];
  for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    const root = `${letter}:\\`;
    try {
      await fs.statfs(root);
      roots.push(root);
    } catch {
      /* esa letra de unidad no existe en este equipo */
    }
  }
  return roots;
}

async function readDisks(): Promise<SystemDisk[]> {
  cachedDiskRoots ??= await discoverDiskRoots();
  const disks: SystemDisk[] = [];
  for (const mount of cachedDiskRoots) {
    try {
      const stats = await fs.statfs(mount);
      const totalBytes = Number(stats.blocks) * Number(stats.bsize);
      // bavail es el espacio realmente disponible para el usuario, que es lo que muestra el sistema.
      const freeBytes = Number(stats.bavail) * Number(stats.bsize);
      if (totalBytes <= 0) continue;
      const usedBytes = Math.max(0, totalBytes - freeBytes);
      disks.push({
        mount,
        totalBytes,
        usedBytes,
        freeBytes,
        usagePercent: clampPercent((usedBytes / totalBytes) * 100),
      });
    } catch {
      /* la unidad ya no responde (extraíble retirada, red caída): se omite */
    }
  }
  return disks;
}

// ---- Red ----

interface ByteCounters {
  received: number;
  sent: number;
}

let previousCounters: { value: ByteCounters; at: number } | null = null;
let sessionBaseline: ByteCounters | null = null;

/**
 * El nombre del adaptador es lo único que se puede saber sin privilegios, y basta para distinguir
 * los casos habituales. Cuando no se reconoce se devuelve "other" en vez de adivinar.
 */
export function networkKindFromName(name: string): NetworkKind {
  const lower = name.toLowerCase();
  if (/wi-?fi|wlan|wireless|airport/.test(lower)) return 'wifi';
  if (/ethernet|^eth\d|local area connection/.test(lower)) return 'ethernet';
  return 'other';
}

function activeInterface(): Pick<SystemNetwork, 'interfaceName' | 'kind' | 'localIp'> {
  for (const [name, addresses] of Object.entries(os.networkInterfaces())) {
    const ipv4 = addresses?.find((address) => !address.internal && address.family === 'IPv4');
    if (ipv4) return { interfaceName: name, kind: networkKindFromName(name), localIp: ipv4.address };
  }
  return { interfaceName: null, kind: null, localIp: null };
}

/** Contadores acumulados de bytes del equipo, o null si la plataforma no los expone. */
async function readByteCounters(): Promise<ByteCounters | null> {
  try {
    if (process.platform === 'win32') {
      // "netstat -e" tarda ~20 ms y da los bytes totales recibidos/enviados.
      const { stdout } = await execFileAsync('netstat', ['-e'], EXEC_OPTIONS);
      return parseWindowsNetstat(stdout);
    }

    if (process.platform === 'linux') {
      const raw = await fs.readFile('/proc/net/dev', 'utf8');
      return parseProcNetDev(raw);
    }

    if (process.platform === 'darwin') {
      const { stdout } = await execFileAsync('netstat', ['-ib'], EXEC_OPTIONS);
      return parseBsdNetstat(stdout);
    }
  } catch {
    /* la utilidad no existe o falló: se informa como no disponible */
  }
  return null;
}

/**
 * Lee la fila "Bytes" de "netstat -e" (Windows). Windows traduce las cabeceras de la tabla pero no
 * la palabra "Bytes", así que esto funciona con el sistema en cualquier idioma.
 */
export function parseWindowsNetstat(stdout: string): ByteCounters | null {
  const match = /^\s*Bytes\s+(\d+)\s+(\d+)/m.exec(stdout);
  return match ? { received: Number(match[1]), sent: Number(match[2]) } : null;
}

/** Suma los bytes de todas las interfaces reales de /proc/net/dev (Linux), omitiendo loopback. */
export function parseProcNetDev(raw: string): ByteCounters {
  let received = 0;
  let sent = 0;
  for (const line of raw.split('\n').slice(2)) {
    const [name, rest] = line.split(':');
    if (!rest || name?.trim() === 'lo') continue;
    const columns = rest.trim().split(/\s+/).map(Number);
    received += columns[0] || 0;
    sent += columns[8] || 0;
  }
  return { received, sent };
}

/** Suma Ibytes/Obytes de "netstat -ib" (macOS), una sola vez por interfaz. */
export function parseBsdNetstat(stdout: string): ByteCounters | null {
  const lines = stdout.split('\n').filter((line) => line.trim().length > 0);
  const header = lines.shift()?.trim().split(/\s+/);
  if (!header) return null;
  const inIndex = header.indexOf('Ibytes');
  const outIndex = header.indexOf('Obytes');
  if (inIndex === -1 || outIndex === -1) return null;

  const seen = new Set<string>();
  let received = 0;
  let sent = 0;
  for (const line of lines) {
    const columns = line.trim().split(/\s+/);
    // Las filas sin dirección tienen una columna menos; se descartan para no desalinear índices.
    if (columns.length <= outIndex) continue;
    const name = columns[0] ?? '';
    if (name === 'lo0' || seen.has(name)) continue;
    seen.add(name);
    received += Number(columns[inIndex]) || 0;
    sent += Number(columns[outIndex]) || 0;
  }
  return seen.size > 0 ? { received, sent } : null;
}

async function readNetwork(): Promise<SystemNetwork> {
  const active = activeInterface();
  const counters = await readByteCounters();
  if (!counters) {
    return {
      ...active,
      downloadBytesPerSecond: null,
      uploadBytesPerSecond: null,
      sessionReceivedBytes: null,
      sessionSentBytes: null,
    };
  }

  sessionBaseline ??= counters;
  const now = Date.now();
  let downloadBytesPerSecond: number | null = null;
  let uploadBytesPerSecond: number | null = null;

  const elapsedSeconds = previousCounters ? (now - previousCounters.at) / 1000 : 0;
  if (previousCounters && elapsedSeconds >= 0.25) {
    // Math.max(0,…) cubre el reinicio de contadores al reconectar un adaptador.
    downloadBytesPerSecond = Math.max(0, (counters.received - previousCounters.value.received) / elapsedSeconds);
    uploadBytesPerSecond = Math.max(0, (counters.sent - previousCounters.value.sent) / elapsedSeconds);
    previousCounters = { value: counters, at: now };
  } else if (!previousCounters) {
    previousCounters = { value: counters, at: now };
  }

  return {
    ...active,
    downloadBytesPerSecond,
    uploadBytesPerSecond,
    sessionReceivedBytes: Math.max(0, counters.received - sessionBaseline.received),
    sessionSentBytes: Math.max(0, counters.sent - sessionBaseline.sent),
  };
}

// ---- Batería ----
// El renderer lee nivel y tiempo restante con navigator.getBattery(), pero esa API finge una
// batería llena en equipos de sobremesa. Aquí se comprueba una única vez si existe de verdad.

let batteryDetection: Promise<boolean | null> | null = null;

function detectBattery(): Promise<boolean | null> {
  batteryDetection ??= (async () => {
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execFileAsync(
          'powershell',
          ['-NoProfile', '-NonInteractive', '-Command', '(Get-CimInstance -ClassName Win32_Battery | Measure-Object).Count'],
          EXEC_OPTIONS,
        );
        return Number(stdout.trim()) > 0;
      }
      if (process.platform === 'linux') {
        const entries = await fs.readdir('/sys/class/power_supply');
        return entries.some((entry) => entry.startsWith('BAT'));
      }
      if (process.platform === 'darwin') {
        const { stdout } = await execFileAsync('pmset', ['-g', 'batt'], EXEC_OPTIONS);
        return stdout.includes('InternalBattery');
      }
    } catch {
      return null;
    }
    return null;
  })();
  return batteryDetection;
}

// ---- Muestra cara: procesos, disco y GPU ----
//
// En Windows todo esto sale de una única invocación de PowerShell (~500 ms medidos). Agruparlo
// importa: lanzar el intérprete cuesta ~200 ms, así que tres consultas sueltas costarían el doble
// que una combinada. Los contadores son acumulados, de modo que cada valor por segundo se obtiene
// restando la muestra anterior.

const WINDOWS_SAMPLE_COMMAND = [
  "$ErrorActionPreference='SilentlyContinue'",
  '$d = Get-CimInstance Win32_PerfRawData_PerfDisk_PhysicalDisk -Filter "Name=\'_Total\'" | Select-Object -First 1 DiskReadBytesPersec,DiskWriteBytesPersec',
  '$m = Get-CimInstance Win32_PerfRawData_PerfOS_Memory | Select-Object -First 1 CacheBytes',
  "$g = Get-CimInstance Win32_PerfRawData_GPUPerformanceCounters_GPUEngine | Where-Object { $_.Name -like '*engtype_3D*' } | Measure-Object -Property UtilizationPercentage -Sum",
  '$gm = Get-CimInstance Win32_PerfRawData_GPUPerformanceCounters_GPUAdapterMemory | Measure-Object -Property DedicatedUsage -Sum',
  "$p = @(Get-CimInstance Win32_PerfRawData_PerfProc_Process | Where-Object { $_.Name -ne '_Total' -and $_.Name -ne 'Idle' } | Select-Object IDProcess,Name,PercentProcessorTime,WorkingSetPrivate,IOReadBytesPersec,IOWriteBytesPersec)",
  '@{ disk=$d; mem=$m; gpu=$g.Sum; gpuMem=$gm.Sum; procs=$p } | ConvertTo-Json -Compress -Depth 4',
].join('\n');

interface WindowsProcessRow {
  IDProcess?: number;
  Name?: string;
  PercentProcessorTime?: number;
  WorkingSetPrivate?: number;
  IOReadBytesPersec?: number;
  IOWriteBytesPersec?: number;
}

interface WindowsSampleRaw {
  disk?: { DiskReadBytesPersec?: number; DiskWriteBytesPersec?: number } | null;
  mem?: { CacheBytes?: number } | null;
  gpu?: number | null;
  gpuMem?: number | null;
  procs?: WindowsProcessRow[] | null;
}

/** Fotografía de los contadores acumulados, para poder restarla en la muestra siguiente. */
export interface SampleState {
  at: number;
  diskRead: number | null;
  diskWrite: number | null;
  gpuTicks: number | null;
  /** pid → { segundos de CPU acumulados, bytes de E/S acumulados } */
  processes: Map<number, { cpuTicks: number; ioBytes: number }>;
}

function perSecond(current: number | null, previous: number | null, elapsedSeconds: number): number | null {
  if (current === null || previous === null || elapsedSeconds <= 0) return null;
  // Math.max(0,…) cubre el reinicio de un contador (reinicio del servicio, adaptador reconectado).
  return Math.max(0, (current - previous) / elapsedSeconds);
}

/**
 * Convierte la salida de PowerShell en una muestra, usando el estado anterior para las tasas.
 * Es una función pura para poder comprobarla sin Windows delante.
 */
export function parseWindowsSample(
  stdout: string,
  now: number,
  previous: SampleState | null,
  cores: number,
): { sample: SystemSample; state: SampleState } {
  const raw = JSON.parse(stdout) as WindowsSampleRaw;
  const elapsedSeconds = previous ? (now - previous.at) / 1000 : 0;
  // Por debajo de medio segundo el ruido de muestreo hace que los porcentajes no signifiquen nada.
  const usable = elapsedSeconds >= 0.5;

  const diskRead = numberOrNull(raw.disk?.DiskReadBytesPersec);
  const diskWrite = numberOrNull(raw.disk?.DiskWriteBytesPersec);
  const gpuTicks = numberOrNull(raw.gpu);

  const state: SampleState = {
    at: now,
    diskRead,
    diskWrite,
    gpuTicks,
    processes: new Map(),
  };

  const processes: SystemProcess[] = [];
  for (const row of raw.procs ?? []) {
    if (typeof row?.IDProcess !== 'number' || typeof row.Name !== 'string') continue;
    const cpuTicks = Number(row.PercentProcessorTime) || 0;
    const ioBytes = (Number(row.IOReadBytesPersec) || 0) + (Number(row.IOWriteBytesPersec) || 0);
    state.processes.set(row.IDProcess, { cpuTicks, ioBytes });

    const before = usable ? previous?.processes.get(row.IDProcess) : undefined;
    processes.push({
      pid: row.IDProcess,
      // Los contadores de rendimiento numeran los procesos repetidos ("chrome#3"); ese sufijo no
      // es parte del nombre y confunde al buscar.
      name: row.Name.replace(/#\d+$/, ''),
      cpuPercent: before
        ? clampPercent(((cpuTicks - before.cpuTicks) / WINDOWS_TICKS_PER_SECOND / elapsedSeconds / cores) * 100)
        : null,
      memoryBytes: Number(row.WorkingSetPrivate) || 0,
      diskBytesPerSecond: before ? Math.max(0, (ioBytes - before.ioBytes) / elapsedSeconds) : null,
    });
  }

  return {
    sample: {
      processes,
      disk: {
        readBytesPerSecond: usable ? perSecond(diskRead, previous?.diskRead ?? null, elapsedSeconds) : null,
        writeBytesPerSecond: usable ? perSecond(diskWrite, previous?.diskWrite ?? null, elapsedSeconds) : null,
      },
      gpu: {
        // El contador del motor 3D acumula tiempo de uso en unidades de 100 ns, igual que la CPU.
        usagePercent:
          usable && gpuTicks !== null && previous?.gpuTicks != null
            ? clampPercent(((gpuTicks - previous.gpuTicks) / WINDOWS_TICKS_PER_SECOND / elapsedSeconds) * 100)
            : null,
        dedicatedMemoryBytes: numberOrNull(raw.gpuMem),
      },
      memoryCacheBytes: numberOrNull(raw.mem?.CacheBytes),
      sampledAt: new Date(now).toISOString(),
    },
    state,
  };
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** macOS y Linux: "ps" ya devuelve el porcentaje de CPU y la memoria residente en KiB. */
export function fromPsOutput(stdout: string): SystemProcess[] {
  const processes: SystemProcess[] = [];
  for (const line of stdout.split('\n')) {
    const match = /^\s*(\d+)\s+(.+?)\s+([\d.]+)\s+(\d+)\s*$/.exec(line);
    if (!match) continue;
    const command = match[2] ?? '';
    processes.push({
      pid: Number(match[1]),
      // "ps" puede devolver la ruta completa; interesa solo el nombre del ejecutable.
      name: command.split('/').pop() || command,
      cpuPercent: clampPercent(Number(match[3])),
      memoryBytes: Number(match[4]) * 1024,
      // "ps" no informa de E/S por proceso y obtenerla exigiría privilegios.
      diskBytesPerSecond: null,
    });
  }
  return processes;
}

/**
 * Suma los sectores leídos y escritos de /proc/diskstats (Linux). Se omiten los dispositivos
 * virtuales (loop, ram) y las particiones, que contarían dos veces lo mismo que su disco.
 */
export function parseProcDiskstats(raw: string): { read: number; write: number } | null {
  let read = 0;
  let write = 0;
  let seen = false;
  for (const line of raw.split('\n')) {
    const columns = line.trim().split(/\s+/);
    if (columns.length < 10) continue;
    const name = columns[2] ?? '';
    if (/^(loop|ram|dm-|zram)/.test(name) || /\d$/.test(name.replace(/^nvme\d+n\d+/, ''))) continue;
    read += Number(columns[5]) || 0;
    write += Number(columns[9]) || 0;
    seen = true;
  }
  // diskstats cuenta en sectores de 512 bytes, siempre, independientemente del sector físico.
  return seen ? { read: read * 512, write: write * 512 } : null;
}

/** Memoria usada como caché de archivos según /proc/meminfo (Linux), en bytes. */
export function parseProcMeminfoCache(raw: string): number | null {
  const cached = /^Cached:\s+(\d+) kB/m.exec(raw);
  const buffers = /^Buffers:\s+(\d+) kB/m.exec(raw);
  if (!cached) return null;
  return (Number(cached[1]) + (buffers ? Number(buffers[1]) : 0)) * 1024;
}

let sampleState: SampleState | null = null;
let sampleInFlight: Promise<SystemSample> | null = null;

async function readSample(): Promise<SystemSample> {
  const now = Date.now();
  const cores = Math.max(1, os.cpus().length);

  if (process.platform === 'win32') {
    const { stdout } = await execFileAsync(
      'powershell',
      ['-NoProfile', '-NonInteractive', '-Command', WINDOWS_SAMPLE_COMMAND],
      EXEC_OPTIONS,
    );
    const { sample, state } = parseWindowsSample(stdout, now, sampleState, cores);
    sampleState = state;
    return sample;
  }

  const [processes, diskRaw, memRaw] = await Promise.all([
    execFileAsync('ps', ['-Ao', 'pid=,comm=,%cpu=,rss='], EXEC_OPTIONS).then(
      ({ stdout }) => fromPsOutput(stdout),
      () => [] as SystemProcess[],
    ),
    // En Linux estos dos son lecturas de archivo: no cuestan prácticamente nada.
    process.platform === 'linux'
      ? fs.readFile('/proc/diskstats', 'utf8').then(parseProcDiskstats, () => null)
      : Promise.resolve(null),
    process.platform === 'linux'
      ? fs.readFile('/proc/meminfo', 'utf8').then(parseProcMeminfoCache, () => null)
      : Promise.resolve(null),
  ]);

  const elapsedSeconds = sampleState ? (now - sampleState.at) / 1000 : 0;
  const usable = elapsedSeconds >= 0.5;
  const previous = sampleState;
  sampleState = {
    at: now,
    diskRead: diskRaw?.read ?? null,
    diskWrite: diskRaw?.write ?? null,
    gpuTicks: null,
    processes: new Map(),
  };

  return {
    processes,
    disk: {
      readBytesPerSecond: usable ? perSecond(diskRaw?.read ?? null, previous?.diskRead ?? null, elapsedSeconds) : null,
      writeBytesPerSecond: usable
        ? perSecond(diskRaw?.write ?? null, previous?.diskWrite ?? null, elapsedSeconds)
        : null,
    },
    // El uso de GPU en macOS y Linux exige herramientas del fabricante que no siempre están.
    gpu: { usagePercent: null, dedicatedMemoryBytes: null },
    memoryCacheBytes: memRaw,
    sampledAt: new Date(now).toISOString(),
  };
}

// ---- API pública ----

export async function getSystemSnapshot(): Promise<SystemSnapshot> {
  const totalBytes = os.totalmem();
  const freeBytes = os.freemem();
  const usedBytes = Math.max(0, totalBytes - freeBytes);
  const [disks, network, hasBattery] = await Promise.all([readDisks(), readNetwork(), detectBattery()]);

  return {
    info: readInfo(),
    cpu: readCpu(),
    memory: {
      totalBytes,
      usedBytes,
      freeBytes,
      usagePercent: totalBytes > 0 ? clampPercent((usedBytes / totalBytes) * 100) : 0,
    },
    disks,
    network,
    uptimeSeconds: os.uptime(),
    hasBattery,
    sampledAt: new Date().toISOString(),
  };
}

/**
 * Muestra cara. Si llega otra petición mientras una está en curso se reutiliza la misma, para que
 * cambiar de pantalla deprisa no encadene invocaciones de PowerShell. Si la utilidad falla se
 * devuelve una muestra vacía en vez de propagar el error: la pantalla mostrará "No disponible" y
 * el resto del monitor seguirá funcionando.
 */
export function getSystemSample(): Promise<SystemSample> {
  sampleInFlight ??= readSample()
    .catch(
      (): SystemSample => ({
        processes: [],
        disk: { readBytesPerSecond: null, writeBytesPerSecond: null },
        gpu: { usagePercent: null, dedicatedMemoryBytes: null },
        memoryCacheBytes: null,
        sampledAt: new Date().toISOString(),
      }),
    )
    .finally(() => {
      sampleInFlight = null;
    });
  return sampleInFlight;
}
