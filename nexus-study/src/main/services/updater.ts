import { app, ipcMain, type BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import { IPC_CHANNELS } from '../../shared/api.ts';
import type { UpdateStatus } from '../../shared/types.ts';

let status: UpdateStatus = {
  state: 'idle',
  currentVersion: app.getVersion(),
  lastCheckedAt: null,
};

let getWindow: () => BrowserWindow | null = () => null;

function emit(patch: Partial<UpdateStatus>): void {
  status = { ...status, ...patch };
  const win = getWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(IPC_CHANNELS.updates.statusChanged, status);
  }
}

// electron-updater expone errores de red/parseo con mensajes técnicos en inglés;
// aquí solo se registran para depuración y se traducen a un mensaje estable para el usuario.
function describeError(error: unknown): string {
  console.error('[updater]', error);
  return 'No se pudo comprobar si hay actualizaciones ahora mismo. Nexus Study seguirá funcionando con normalidad.';
}

async function checkForUpdates(): Promise<UpdateStatus> {
  if (!app.isPackaged) {
    emit({ state: 'disabled-dev' });
    return status;
  }
  emit({ lastCheckedAt: new Date().toISOString() });
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    emit({ state: 'error', error: describeError(error) });
  }
  return status;
}

/**
 * Prepara el actualizador automático (electron-updater + GitHub Releases) y registra
 * los canales IPC para que Ajustes pueda consultarlo. En desarrollo (app sin empaquetar)
 * queda desactivado por diseño: no tiene sentido comprobar actualizaciones fuera de una
 * instalación real, y evita ruido/errores de red durante el desarrollo.
 */
export function initUpdater(windowGetter: () => BrowserWindow | null): void {
  getWindow = windowGetter;
  status.currentVersion = app.getVersion();

  ipcMain.handle(IPC_CHANNELS.updates.getStatus, () => status);
  ipcMain.handle(IPC_CHANNELS.updates.check, () => checkForUpdates());
  ipcMain.handle(IPC_CHANNELS.updates.install, () => {
    if (status.state === 'downloaded') autoUpdater.quitAndInstall();
  });

  if (!app.isPackaged) {
    emit({ state: 'disabled-dev' });
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = console;

  autoUpdater.on('checking-for-update', () => emit({ state: 'checking', error: undefined }));
  autoUpdater.on('update-available', (info) =>
    emit({
      state: 'available',
      availableVersion: info.version,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : null,
    }),
  );
  autoUpdater.on('update-not-available', () =>
    emit({ state: 'up-to-date', lastCheckedAt: new Date().toISOString() }),
  );
  autoUpdater.on('download-progress', (progress) =>
    emit({ state: 'downloading', percent: Math.round(progress.percent) }),
  );
  autoUpdater.on('update-downloaded', (info) =>
    emit({
      state: 'downloaded',
      availableVersion: info.version,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : null,
    }),
  );
  autoUpdater.on('error', (error) => emit({ state: 'error', error: describeError(error) }));

  // Comprobación silenciosa al iniciar, con un pequeño margen para no competir con el arranque de la ventana.
  setTimeout(() => void checkForUpdates(), 3000);
}
