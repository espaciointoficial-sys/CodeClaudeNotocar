// Acciones rápidas: abren herramientas del propio sistema operativo.
//
// Seguridad: el renderer solo puede enviar un identificador de la lista de abajo. No existe ninguna
// vía para ejecutar un comando escrito por el usuario, ni para pasar argumentos. Cada acción se
// limita a *abrir* una herramienta nativa y dejar la decisión en manos de quien la usa: aquí no se
// cierra ningún proceso, no se borra nada y no se piden permisos de administrador.
import { execFile } from 'node:child_process';
import os from 'node:os';
import { promisify } from 'node:util';
import { shell } from 'electron';
import type { SystemLatency, SystemQuickAction } from '@shared/types';
import { ValidationError } from '../lib/util.ts';
import { parsePingOutput } from './systemParsers.ts';
import { getSystemReport } from './systemReport.ts';

const execFileAsync = promisify(execFile);
const EXEC_OPTIONS = { windowsHide: true, timeout: 15_000, maxBuffer: 1024 * 1024 };

interface ActionDefinition extends SystemQuickAction {
  run: (context: { userDataDir: string }) => Promise<unknown>;
}

/** Abre un ejecutable del sistema sin argumentos. Los nombres son constantes de este archivo. */
function launch(binary: string, args: string[] = []): () => Promise<unknown> {
  return () => execFileAsync(binary, args, EXEC_OPTIONS);
}

/** Abre una página de Configuración de Windows por su URI oficial. También constantes. */
function openUri(uri: string): () => Promise<unknown> {
  return () => shell.openExternal(uri);
}

const WINDOWS_ACTIONS: ActionDefinition[] = [
  {
    id: 'task-manager',
    label: 'Administrador de tareas',
    description: 'Abre el Administrador de tareas de Windows.',
    icon: 'activity',
    run: launch('taskmgr.exe'),
  },
  {
    id: 'resource-monitor',
    label: 'Monitor de recursos',
    description: 'Abre el Monitor de recursos de Windows.',
    icon: 'gauge',
    run: launch('resmon.exe'),
  },
  {
    id: 'security',
    label: 'Seguridad de Windows',
    description: 'Abre Seguridad de Windows (antivirus y protección).',
    icon: 'shield',
    run: openUri('windowsdefender:'),
  },
  {
    id: 'windows-update',
    label: 'Windows Update',
    description: 'Abre la página de actualizaciones de Windows.',
    icon: 'download',
    run: openUri('ms-settings:windowsupdate'),
  },
  {
    id: 'settings',
    label: 'Configuración del sistema',
    description: 'Abre la Configuración de Windows.',
    icon: 'sliders',
    run: openUri('ms-settings:'),
  },
  {
    id: 'network-settings',
    label: 'Configuración de red',
    description: 'Abre los ajustes de red e Internet.',
    icon: 'wifi',
    run: openUri('ms-settings:network'),
  },
  {
    id: 'storage-settings',
    label: 'Configuración de almacenamiento',
    description: 'Abre los ajustes de almacenamiento de Windows.',
    icon: 'hard-drive',
    run: openUri('ms-settings:storagesense'),
  },
  {
    id: 'power-settings',
    label: 'Energía y batería',
    description: 'Abre los ajustes de energía y suspensión.',
    icon: 'battery',
    run: openUri('ms-settings:powersleep'),
  },
  {
    id: 'apps',
    label: 'Aplicaciones instaladas',
    description: 'Abre la lista de aplicaciones instaladas.',
    icon: 'package',
    run: openUri('ms-settings:appsfeatures'),
  },
  {
    id: 'device-manager',
    label: 'Administrador de dispositivos',
    description: 'Abre el Administrador de dispositivos.',
    icon: 'cpu',
    run: launch('mmc.exe', ['devmgmt.msc']),
  },
  {
    id: 'disk-cleanup',
    label: 'Liberador de espacio',
    description: 'Abre la herramienta de Windows. No borra nada por su cuenta.',
    icon: 'trash',
    run: launch('cleanmgr.exe'),
  },
];

const MAC_ACTIONS: ActionDefinition[] = [
  {
    id: 'task-manager',
    label: 'Monitor de Actividad',
    description: 'Abre el Monitor de Actividad de macOS.',
    icon: 'activity',
    run: launch('open', ['-a', 'Activity Monitor']),
  },
  {
    id: 'settings',
    label: 'Ajustes del Sistema',
    description: 'Abre los Ajustes del Sistema.',
    icon: 'sliders',
    run: launch('open', ['x-apple.systempreferences:']),
  },
  {
    id: 'network-settings',
    label: 'Ajustes de red',
    description: 'Abre el panel de red de los Ajustes del Sistema.',
    icon: 'wifi',
    run: launch('open', ['x-apple.systempreferences:com.apple.preference.network']),
  },
];

/** Las herramientas gráficas de Linux dependen del escritorio, así que solo se ofrece lo seguro. */
const LINUX_ACTIONS: ActionDefinition[] = [];

const COMMON_ACTIONS: ActionDefinition[] = [
  {
    id: 'data-folder',
    label: 'Carpeta de datos de Nexus Study',
    description: 'Abre la carpeta donde Nexus Study guarda tus documentos y su base de datos.',
    icon: 'folder',
    run: ({ userDataDir }) => shell.openPath(userDataDir),
  },
  {
    id: 'home-folder',
    label: 'Carpeta personal',
    description: 'Abre tu carpeta personal en el explorador de archivos.',
    icon: 'folder',
    run: () => shell.openPath(os.homedir()),
  },
];

function platformActions(): ActionDefinition[] {
  const byPlatform =
    process.platform === 'win32' ? WINDOWS_ACTIONS : process.platform === 'darwin' ? MAC_ACTIONS : LINUX_ACTIONS;
  return [...byPlatform, ...COMMON_ACTIONS];
}

export function listQuickActions(): SystemQuickAction[] {
  return platformActions().map(({ id, label, description, icon }) => ({ id, label, description, icon }));
}

export async function runQuickAction(id: unknown, userDataDir: string): Promise<void> {
  const action = typeof id === 'string' ? platformActions().find((item) => item.id === id) : undefined;
  if (!action) throw new ValidationError('Esa acción no está disponible en este equipo.');
  try {
    await action.run({ userDataDir });
  } catch {
    throw new ValidationError(`No se ha podido abrir "${action.label}". Puede que no exista en este sistema.`);
  }
}

// ---- Latencia ----

/**
 * Mide la latencia hasta la puerta de enlace de la red local: el router de casa, no un servidor de
 * Internet. Así la comprobación no envía nada fuera de la red del usuario. Es manual a propósito,
 * para que no haya tráfico de fondo.
 */
export async function measureLatency(): Promise<SystemLatency> {
  const { gateway } = await getSystemReport();
  if (!gateway) {
    return {
      target: 'puerta de enlace',
      averageMs: null,
      error: 'No se ha podido identificar la puerta de enlace de la red en este sistema.',
    };
  }

  const target = `${gateway} (puerta de enlace)`;
  const args = process.platform === 'win32' ? ['-n', '4', '-w', '1000', gateway] : ['-c', '4', '-W', '1', gateway];
  try {
    const { stdout } = await execFileAsync('ping', args, EXEC_OPTIONS);
    const averageMs = parsePingOutput(stdout, gateway);
    return averageMs === null
      ? { target, averageMs: null, error: 'La puerta de enlace no ha respondido.' }
      : { target, averageMs };
  } catch {
    return { target, averageMs: null, error: 'La puerta de enlace no ha respondido.' };
  }
}
