import { app, BrowserWindow, Menu } from 'electron';
import { registerDocumentProtocolScheme, registerDocumentProtocolHandler } from './protocol.ts';
import { openDatabase } from './db/connection.ts';
import { registerIpcHandlers } from './ipc/handlers.ts';
import { DocumentsRepository } from './repositories/documents.repo.ts';
import { getDocumentsDir } from './files/storage.ts';
import { createMainWindow } from './window.ts';
import { initUpdater } from './services/updater.ts';

registerDocumentProtocolScheme();

let mainWindow: BrowserWindow | null = null;

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    app.setName('Nexus Study');
    Menu.setApplicationMenu(null);

    const userDataDir = app.getPath('userData');
    const db = openDatabase(userDataDir);

    const documentsDir = getDocumentsDir(userDataDir);
    registerDocumentProtocolHandler(new DocumentsRepository(db), documentsDir);

    registerIpcHandlers({
      db,
      userDataDir,
      getMainWindow: () => mainWindow,
    });

    mainWindow = createMainWindow();
    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    initUpdater(() => mainWindow);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createMainWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
