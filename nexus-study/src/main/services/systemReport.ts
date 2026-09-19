// Informe del equipo: los datos que no cambian mientras Nexus Study está abierto (hardware,
// volúmenes, estado de seguridad) y el espacio que ocupa la propia aplicación.
//
// Privacidad: igual que el resto del monitor, todo se consulta en local y solo se muestra en
// pantalla. Aquí no se lee ningún archivo del usuario: para calcular el tamaño de la carpeta de
// datos se consultan únicamente los metadatos de tamaño, nunca el contenido.
//
// Coste: en Windows reunir todo esto tarda unos 3 segundos porque obliga a cargar varios módulos
// de PowerShell. Por eso se hace una sola vez por sesión y se guarda el resultado: las pantallas
// que lo usan muestran un indicador de carga la primera vez y son instantáneas después.
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { screen } from 'electron';
import type { SystemDisplay, SystemReport, SystemSecurity, SystemStorageUsage } from '@shared/types';
import { decodeProductState, parseProcNetRoute, parseSsid } from './systemParsers.ts';

const execFileAsync = promisify(execFile);
const EXEC_OPTIONS = { windowsHide: true, timeout: 20_000, maxBuffer: 8 * 1024 * 1024 };

const NOT_WINDOWS_NOTE =
  'El informe detallado de hardware y seguridad usa herramientas propias de Windows. En este sistema solo se muestran los datos que expone Node.';
const TEMPERATURE_NOTE =
  'La temperatura de CPU y GPU no se muestra: leerla requiere permisos de administrador y Nexus Study no los pide.';

/**
 * Todo en una sola invocación a propósito. Cargar el intérprete y sus módulos es la parte cara;
 * repartir estas consultas en varias llamadas multiplicaría ese coste sin ganar nada.
 * Cada consulta lleva -EA SilentlyContinue: si una falla, el resto del informe sigue llegando.
 */
const WINDOWS_REPORT_COMMAND = [
  "$ErrorActionPreference='SilentlyContinue'",
  '$out = @{}',
  '$out.cpu = Get-CimInstance Win32_Processor | Select-Object -First 1 NumberOfCores,MaxClockSpeed',
  '$out.gpu = @(Get-CimInstance Win32_VideoController | Select-Object Name,DriverVersion,CurrentHorizontalResolution,CurrentVerticalResolution,CurrentRefreshRate)',
  '$out.cs = Get-CimInstance Win32_ComputerSystem | Select-Object Manufacturer,Model',
  '$out.bb = Get-CimInstance Win32_BaseBoard | Select-Object Manufacturer,Product',
  '$out.bios = Get-CimInstance Win32_BIOS | Select-Object Manufacturer,SMBIOSBIOSVersion',
  '$out.ram = @(Get-CimInstance Win32_PhysicalMemory | Select-Object Capacity,Speed,Manufacturer)',
  "$out.audio = @(Get-CimInstance Win32_SoundDevice | Where-Object Status -eq 'OK' | Select-Object -First 8 Name)",
  '$out.av = @(Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntiVirusProduct | Select-Object displayName,productState,timestamp)',
  '$out.fw = @(Get-NetFirewallProfile | Select-Object Name,Enabled)',
  '$out.vol = @(Get-Volume | Where-Object DriveLetter | Select-Object DriveLetter,FileSystemLabel,FileSystem,DriveType)',
  '$out.part = @(Get-Partition | Where-Object DriveLetter | Select-Object DriveLetter,DiskNumber)',
  '$out.pd = @(Get-PhysicalDisk | Select-Object DeviceId,MediaType,FriendlyName,BusType)',
  "$out.gw = @(Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Sort-Object RouteMetric | Select-Object -First 1 NextHop)",
  '$out | ConvertTo-Json -Compress -Depth 5',
].join('\n');

function readDisplays(): SystemDisplay[] {
  try {
    const primaryId = screen.getPrimaryDisplay().id;
    return screen.getAllDisplays().map((display) => ({
      id: display.id,
      width: display.bounds.width,
      height: display.bounds.height,
      scaleFactor: display.scaleFactor,
      refreshRate: display.displayFrequency > 0 ? display.displayFrequency : null,
      primary: display.id === primaryId,
    }));
  } catch {
    return [];
  }
}

function emptyReport(notes: string[]): SystemReport {
  return {
    hardware: {
      manufacturer: null,
      model: null,
      baseboard: null,
      bios: null,
      cpuCores: null,
      cpuMaxMhz: null,
      gpus: [],
      memoryModules: [],
      audioDevices: [],
      displays: readDisplays(),
    },
    security: { antivirus: [], firewall: [] },
    volumes: [],
    gateway: null,
    ssid: null,
    notes,
  };
}

interface WindowsReportRaw {
  cpu?: { NumberOfCores?: number; MaxClockSpeed?: number } | null;
  gpu?: {
    Name?: string;
    DriverVersion?: string;
    CurrentHorizontalResolution?: number;
    CurrentVerticalResolution?: number;
    CurrentRefreshRate?: number;
  }[];
  cs?: { Manufacturer?: string; Model?: string } | null;
  bb?: { Manufacturer?: string; Product?: string } | null;
  bios?: { Manufacturer?: string; SMBIOSBIOSVersion?: string } | null;
  ram?: { Capacity?: number; Speed?: number; Manufacturer?: string }[];
  audio?: { Name?: string }[];
  av?: { displayName?: string; productState?: number; timestamp?: string }[];
  fw?: { Name?: string; Enabled?: number | boolean }[];
  vol?: { DriveLetter?: string; FileSystemLabel?: string; FileSystem?: string; DriveType?: string }[];
  part?: { DriveLetter?: string; DiskNumber?: number }[];
  pd?: { DeviceId?: string; MediaType?: string; FriendlyName?: string; BusType?: string }[];
  gw?: { NextHop?: string }[];
}

function text(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function readSecurity(raw: WindowsReportRaw): SystemSecurity {
  return {
    antivirus: (raw.av ?? [])
      .filter((item) => text(item.displayName))
      .map((item) => {
        const decoded = typeof item.productState === 'number' ? decodeProductState(item.productState) : null;
        return {
          name: item.displayName!.trim(),
          enabled: decoded?.enabled ?? null,
          upToDate: decoded?.upToDate ?? null,
          updatedAt: item.timestamp ? new Date(item.timestamp).toISOString() : null,
        };
      }),
    firewall: (raw.fw ?? [])
      .filter((item) => text(item.Name))
      .map((item) => ({ profile: item.Name!.trim(), enabled: Boolean(item.Enabled) })),
  };
}

/** Cruza volumen → partición → disco físico para saber si cada unidad es SSD o disco mecánico. */
function readVolumes(raw: WindowsReportRaw): SystemReport['volumes'] {
  const diskByLetter = new Map((raw.part ?? []).map((item) => [item.DriveLetter, item.DiskNumber]));
  const physicalById = new Map((raw.pd ?? []).map((item) => [String(item.DeviceId), item]));

  return (raw.vol ?? [])
    .filter((volume) => text(volume.DriveLetter))
    .map((volume) => {
      const letter = volume.DriveLetter!.trim();
      const physical = physicalById.get(String(diskByLetter.get(letter)));
      return {
        mount: `${letter}:\\`,
        label: text(volume.FileSystemLabel),
        fileSystem: text(volume.FileSystem),
        driveType: text(volume.DriveType),
        // "Unspecified" es lo que devuelve el sistema cuando no lo sabe; no aporta nada mostrarlo.
        mediaType: text(physical?.MediaType) === 'Unspecified' ? null : text(physical?.MediaType),
        busType: text(physical?.BusType),
        model: text(physical?.FriendlyName),
      };
    });
}

async function readSsid(): Promise<string | null> {
  if (process.platform !== 'win32') return null;
  try {
    const { stdout } = await execFileAsync('netsh', ['wlan', 'show', 'interfaces'], EXEC_OPTIONS);
    return parseSsid(stdout);
  } catch {
    // Sin adaptador Wi-Fi el comando falla; no es un error que deba verse.
    return null;
  }
}

async function buildReport(): Promise<SystemReport> {
  if (process.platform !== 'win32') {
    const report = emptyReport([NOT_WINDOWS_NOTE, TEMPERATURE_NOTE]);
    // En Linux la puerta de enlace sí está disponible y es una simple lectura de archivo.
    if (process.platform === 'linux') {
      report.gateway = await fs.readFile('/proc/net/route', 'utf8').then(parseProcNetRoute, () => null);
    }
    return report;
  }

  try {
    const [{ stdout }, ssid] = await Promise.all([
      execFileAsync('powershell', ['-NoProfile', '-NonInteractive', '-Command', WINDOWS_REPORT_COMMAND], EXEC_OPTIONS),
      readSsid(),
    ]);
    const raw = JSON.parse(stdout) as WindowsReportRaw;
    const notes = [TEMPERATURE_NOTE];
    if ((raw.av ?? []).length === 0) {
      notes.push('El centro de seguridad de Windows no ha devuelto ningún antivirus registrado.');
    }

    return {
      hardware: {
        manufacturer: text(raw.cs?.Manufacturer),
        model: text(raw.cs?.Model),
        baseboard: [text(raw.bb?.Manufacturer), text(raw.bb?.Product)].filter(Boolean).join(' ') || null,
        bios: [text(raw.bios?.Manufacturer), text(raw.bios?.SMBIOSBIOSVersion)].filter(Boolean).join(' ') || null,
        cpuCores: raw.cpu?.NumberOfCores ?? null,
        cpuMaxMhz: raw.cpu?.MaxClockSpeed ?? null,
        gpus: (raw.gpu ?? [])
          .filter((gpu) => text(gpu.Name))
          .map((gpu) => ({
            name: gpu.Name!.trim(),
            driverVersion: text(gpu.DriverVersion),
            resolution:
              gpu.CurrentHorizontalResolution && gpu.CurrentVerticalResolution
                ? `${gpu.CurrentHorizontalResolution} × ${gpu.CurrentVerticalResolution}`
                : null,
            refreshHz: gpu.CurrentRefreshRate ?? null,
          })),
        memoryModules: (raw.ram ?? [])
          .filter((module) => typeof module.Capacity === 'number')
          .map((module) => ({
            capacityBytes: module.Capacity!,
            speedMhz: module.Speed ?? null,
            manufacturer: text(module.Manufacturer),
          })),
        audioDevices: (raw.audio ?? []).map((device) => text(device.Name)).filter((name): name is string => !!name),
        displays: readDisplays(),
      },
      security: readSecurity(raw),
      volumes: readVolumes(raw),
      gateway: text(raw.gw?.[0]?.NextHop),
      ssid,
      notes,
    };
  } catch {
    return emptyReport(['No se ha podido reunir la información del equipo. El resto del monitor sigue funcionando.']);
  }
}

let cachedReport: Promise<SystemReport> | null = null;

/** Se calcula una vez por sesión: nada de esto cambia mientras la aplicación está abierta. */
export function getSystemReport(): Promise<SystemReport> {
  cachedReport ??= buildReport();
  return cachedReport;
}

// ---- Espacio ocupado por Nexus Study ----

async function directorySize(dir: string): Promise<{ bytes: number; files: number }> {
  let bytes = 0;
  let files = 0;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return { bytes: 0, files: 0 };
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await directorySize(full);
      bytes += nested.bytes;
      files += nested.files;
    } else {
      try {
        // Solo se consulta el tamaño: en ningún momento se abre ni se lee el contenido.
        bytes += (await fs.stat(full)).size;
        files += 1;
      } catch {
        /* el archivo desapareció entre el listado y la consulta */
      }
    }
  }
  return { bytes, files };
}

export async function getStorageUsage(userDataDir: string): Promise<SystemStorageUsage> {
  const documents = await directorySize(join(userDataDir, 'documents'));
  const total = await directorySize(userDataDir);

  let databaseBytes = 0;
  // SQLite deja además archivos -wal y -shm junto a la base de datos; cuentan como base de datos.
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      databaseBytes += (await fs.stat(join(userDataDir, `nexus-study.db${suffix}`))).size;
    } catch {
      /* ese archivo auxiliar no existe ahora mismo */
    }
  }

  return {
    dataDir: userDataDir,
    documentsBytes: documents.bytes,
    databaseBytes,
    otherBytes: Math.max(0, total.bytes - documents.bytes - databaseBytes),
    documentCount: documents.files,
  };
}
