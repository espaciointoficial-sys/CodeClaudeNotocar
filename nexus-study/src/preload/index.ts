import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { IPC_CHANNELS } from '@shared/api';
import type { NexusApi } from '@shared/api';

const api: NexusApi = {
  subjects: {
    list: (includeArchived) => ipcRenderer.invoke(IPC_CHANNELS.subjects.list, includeArchived),
    get: (id) => ipcRenderer.invoke(IPC_CHANNELS.subjects.get, id),
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.subjects.create, input),
    update: (id, input) => ipcRenderer.invoke(IPC_CHANNELS.subjects.update, id, input),
    setArchived: (id, archived) => ipcRenderer.invoke(IPC_CHANNELS.subjects.setArchived, id, archived),
    reorder: (orderedIds) => ipcRenderer.invoke(IPC_CHANNELS.subjects.reorder, orderedIds),
    remove: (id) => ipcRenderer.invoke(IPC_CHANNELS.subjects.remove, id),
    touchAccessed: (id) => ipcRenderer.invoke(IPC_CHANNELS.subjects.touchAccessed, id),
  },
  folders: {
    listBySubject: (subjectId) => ipcRenderer.invoke(IPC_CHANNELS.folders.listBySubject, subjectId),
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.folders.create, input),
    update: (id, input) => ipcRenderer.invoke(IPC_CHANNELS.folders.update, id, input),
    remove: (id) => ipcRenderer.invoke(IPC_CHANNELS.folders.remove, id),
  },
  documents: {
    listBySubject: (subjectId, filters) => ipcRenderer.invoke(IPC_CHANNELS.documents.listBySubject, subjectId, filters),
    listLibrary: (filters) => ipcRenderer.invoke(IPC_CHANNELS.documents.listLibrary, filters),
    get: (id) => ipcRenderer.invoke(IPC_CHANNELS.documents.get, id),
    chooseFiles: () => ipcRenderer.invoke(IPC_CHANNELS.documents.chooseFiles),
    importFiles: (subjectId, filePaths, input) =>
      ipcRenderer.invoke(IPC_CHANNELS.documents.importFiles, subjectId, filePaths, input),
    update: (id, input) => ipcRenderer.invoke(IPC_CHANNELS.documents.update, id, input),
    move: (id, folderId) => ipcRenderer.invoke(IPC_CHANNELS.documents.move, id, folderId),
    remove: (id) => ipcRenderer.invoke(IPC_CHANNELS.documents.remove, id),
    registerOpen: (id) => ipcRenderer.invoke(IPC_CHANNELS.documents.registerOpen, id),
    registerStudy: (id) => ipcRenderer.invoke(IPC_CHANNELS.documents.registerStudy, id),
    setLastPage: (id, page) => ipcRenderer.invoke(IPC_CHANNELS.documents.setLastPage, id, page),
  },
  notes: {
    listBySubject: (subjectId) => ipcRenderer.invoke(IPC_CHANNELS.notes.listBySubject, subjectId),
    listByDocument: (documentId) => ipcRenderer.invoke(IPC_CHANNELS.notes.listByDocument, documentId),
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.notes.create, input),
    update: (id, input) => ipcRenderer.invoke(IPC_CHANNELS.notes.update, id, input),
    remove: (id) => ipcRenderer.invoke(IPC_CHANNELS.notes.remove, id),
  },
  bookmarks: {
    listByDocument: (documentId) => ipcRenderer.invoke(IPC_CHANNELS.bookmarks.listByDocument, documentId),
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.bookmarks.create, input),
    update: (id, input) => ipcRenderer.invoke(IPC_CHANNELS.bookmarks.update, id, input),
    remove: (id) => ipcRenderer.invoke(IPC_CHANNELS.bookmarks.remove, id),
  },
  tasks: {
    listBySubject: (subjectId, filters) => ipcRenderer.invoke(IPC_CHANNELS.tasks.listBySubject, subjectId, filters),
    listAll: (filters) => ipcRenderer.invoke(IPC_CHANNELS.tasks.listAll, filters),
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.tasks.create, input),
    update: (id, input) => ipcRenderer.invoke(IPC_CHANNELS.tasks.update, id, input),
    setCompleted: (id, completed) => ipcRenderer.invoke(IPC_CHANNELS.tasks.setCompleted, id, completed),
    remove: (id) => ipcRenderer.invoke(IPC_CHANNELS.tasks.remove, id),
  },
  events: {
    list: (range) => ipcRenderer.invoke(IPC_CHANNELS.events.list, range),
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.events.create, input),
    update: (id, input) => ipcRenderer.invoke(IPC_CHANNELS.events.update, id, input),
    remove: (id) => ipcRenderer.invoke(IPC_CHANNELS.events.remove, id),
  },
  studySessions: {
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.studySessions.create, input),
    listBySubject: (subjectId) => ipcRenderer.invoke(IPC_CHANNELS.studySessions.listBySubject, subjectId),
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.settings.get),
    update: (input) => ipcRenderer.invoke(IPC_CHANNELS.settings.update, input),
  },
  stats: {
    summary: (period) => ipcRenderer.invoke(IPC_CHANNELS.stats.summary, period),
  },
  home: {
    summary: () => ipcRenderer.invoke(IPC_CHANNELS.home.summary),
  },
  system: {
    openExternal: (url) => ipcRenderer.invoke(IPC_CHANNELS.system.openExternal, url),
    notify: (title, body) => ipcRenderer.invoke(IPC_CHANNELS.system.notify, title, body),
  },
  weather: {
    current: (city) => ipcRenderer.invoke(IPC_CHANNELS.weather.current, city),
  },
  monitor: {
    snapshot: () => ipcRenderer.invoke(IPC_CHANNELS.monitor.snapshot),
    sample: () => ipcRenderer.invoke(IPC_CHANNELS.monitor.sample),
    report: () => ipcRenderer.invoke(IPC_CHANNELS.monitor.report),
    storageUsage: () => ipcRenderer.invoke(IPC_CHANNELS.monitor.storageUsage),
    quickActions: () => ipcRenderer.invoke(IPC_CHANNELS.monitor.quickActions),
    runQuickAction: (id) => ipcRenderer.invoke(IPC_CHANNELS.monitor.runQuickAction, id),
    latency: () => ipcRenderer.invoke(IPC_CHANNELS.monitor.latency),
  },
  updates: {
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.updates.getStatus),
    check: () => ipcRenderer.invoke(IPC_CHANNELS.updates.check),
    install: () => ipcRenderer.invoke(IPC_CHANNELS.updates.install),
    onStatusChange: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, status: Parameters<typeof callback>[0]) =>
        callback(status);
      ipcRenderer.on(IPC_CHANNELS.updates.statusChanged, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.updates.statusChanged, listener);
    },
  },
};

contextBridge.exposeInMainWorld('api', api);

// Puente mínimo para resolver la ruta real de un archivo arrastrado (drag & drop).
// webUtils.getPathForFile sustituye a la antigua propiedad File.path, retirada por Electron.
contextBridge.exposeInMainWorld('fileUtils', {
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
});
