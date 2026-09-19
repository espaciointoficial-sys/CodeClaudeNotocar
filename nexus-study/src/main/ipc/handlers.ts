import { ipcMain, dialog, shell, Notification, type BrowserWindow } from 'electron';
import type { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { IPC_CHANNELS } from '../../shared/api.ts';
import type {
  AgendaRange,
  AppSettingsInput,
  BookmarkInput,
  DocumentFilters,
  DocumentInput,
  DocumentUpdateInput,
  EventInput,
  FolderInput,
  HomeSummary,
  ImportResult,
  LibraryFilters,
  NoteInput,
  StatsPeriod,
  StudySessionInput,
  SubjectInput,
  TaskFilters,
  TaskInput,
} from '@shared/types';
import { SubjectsRepository } from '../repositories/subjects.repo.ts';
import { FoldersRepository } from '../repositories/folders.repo.ts';
import { DocumentsRepository } from '../repositories/documents.repo.ts';
import { NotesRepository } from '../repositories/notes.repo.ts';
import { BookmarksRepository } from '../repositories/bookmarks.repo.ts';
import { TasksRepository } from '../repositories/tasks.repo.ts';
import { EventsRepository } from '../repositories/events.repo.ts';
import { StudySessionsRepository } from '../repositories/studySessions.repo.ts';
import { SettingsRepository } from '../repositories/settings.repo.ts';
import { StatsRepository } from '../repositories/stats.repo.ts';
import { deleteDocumentFile, getDocumentsDir, importFileToStorage } from '../files/storage.ts';
import { extractPdfInfo } from '../files/pdf.ts';
import { fetchWeather } from '../services/weather.ts';
import { getSystemSample, getSystemSnapshot } from '../services/systemMonitor.ts';
import { getStorageUsage, getSystemReport } from '../services/systemReport.ts';
import { listQuickActions, measureLatency, runQuickAction } from '../services/systemActions.ts';
import { newId, ValidationError } from '../lib/util.ts';
import { assertString, assertStringArray } from './validate.ts';

export interface IpcContext {
  db: DatabaseSync;
  userDataDir: string;
  getMainWindow: () => BrowserWindow | null;
}

/** Envuelve un handler para traducir errores de dominio en mensajes claros y evitar que IPC se rompa silenciosamente. */
function handle<Args extends unknown[], Result>(
  channel: string,
  fn: (...args: Args) => Result | Promise<Result>,
): void {
  ipcMain.handle(channel, async (_event, ...args: Args) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      console.error(`[IPC:${channel}]`, error);
      throw error instanceof Error ? error : new Error('Error inesperado en el proceso principal.');
    }
  });
}

export function registerIpcHandlers(ctx: IpcContext): void {
  const subjects = new SubjectsRepository(ctx.db);
  const folders = new FoldersRepository(ctx.db);
  const documents = new DocumentsRepository(ctx.db);
  const notes = new NotesRepository(ctx.db);
  const bookmarks = new BookmarksRepository(ctx.db);
  const tasks = new TasksRepository(ctx.db);
  const events = new EventsRepository(ctx.db);
  const studySessions = new StudySessionsRepository(ctx.db);
  const settings = new SettingsRepository(ctx.db);
  const stats = new StatsRepository(ctx.db);
  const documentsDir = getDocumentsDir(ctx.userDataDir);

  // ---- Asignaturas ----
  handle(IPC_CHANNELS.subjects.list, (includeArchived?: boolean) => subjects.listWithStats(!!includeArchived));
  handle(IPC_CHANNELS.subjects.get, (id: string) => subjects.get(id));
  handle(IPC_CHANNELS.subjects.create, (input: SubjectInput) => subjects.create(input));
  handle(IPC_CHANNELS.subjects.update, (id: string, input: Partial<SubjectInput>) => subjects.update(id, input));
  handle(IPC_CHANNELS.subjects.setArchived, (id: string, archived: boolean) => subjects.setArchived(id, archived));
  handle(IPC_CHANNELS.subjects.reorder, (orderedIds: string[]) =>
    subjects.reorder(assertStringArray(orderedIds, 'orderedIds')),
  );
  handle(IPC_CHANNELS.subjects.remove, (id: string) => {
    for (const doc of documents.listBySubject(id)) {
      deleteDocumentFile(documentsDir, doc.internalPath);
    }
    subjects.remove(id);
  });
  handle(IPC_CHANNELS.subjects.touchAccessed, (id: string) => subjects.touchAccessed(id));

  // ---- Temas / carpetas ----
  handle(IPC_CHANNELS.folders.listBySubject, (subjectId: string) => folders.listBySubject(subjectId));
  handle(IPC_CHANNELS.folders.create, (input: FolderInput) => folders.create(input));
  handle(IPC_CHANNELS.folders.update, (id: string, input: Partial<FolderInput>) => folders.update(id, input));
  handle(IPC_CHANNELS.folders.remove, (id: string) => folders.remove(id));

  // ---- Documentos / apuntes ----
  handle(IPC_CHANNELS.documents.listBySubject, (subjectId: string, filters?: DocumentFilters) =>
    documents.listBySubject(subjectId, filters),
  );
  handle(IPC_CHANNELS.documents.listLibrary, (filters?: LibraryFilters) => documents.listLibrary(filters));
  handle(IPC_CHANNELS.documents.get, (id: string) => documents.get(id));
  handle(IPC_CHANNELS.documents.chooseFiles, async () => {
    const win = ctx.getMainWindow();
    if (!win) return [];
    const result = await dialog.showOpenDialog(win, {
      title: 'Importar apuntes',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Documentos admitidos', extensions: ['pdf', 'jpg', 'jpeg', 'png', 'webp'] }],
    });
    return result.canceled ? [] : result.filePaths;
  });
  handle(
    IPC_CHANNELS.documents.importFiles,
    async (subjectId: string, filePaths: string[], input?: DocumentInput): Promise<ImportResult[]> => {
      assertString(subjectId, 'subjectId');
      assertStringArray(filePaths, 'filePaths');
      const results: ImportResult[] = [];
      for (const filePath of filePaths) {
        const fileName = filePath.split(/[\\/]/).pop() ?? filePath;
        try {
          const tempId = newId();
          const copied = importFileToStorage(filePath, documentsDir, tempId);
          const { pageCount, contentText } =
            copied.fileType === 'pdf'
              ? await extractPdfInfo(join(documentsDir, copied.internalPath))
              : { pageCount: null, contentText: null };
          const title = input?.title?.trim() || copied.originalName.replace(/\.[^.]+$/, '');
          const created = documents.create({
            subjectId,
            folderId: input?.folderId ?? null,
            title,
            originalName: copied.originalName,
            internalPath: copied.internalPath,
            fileType: copied.fileType,
            sizeBytes: copied.sizeBytes,
            pageCount,
            tags: input?.tags,
            description: input?.description,
            contentText,
          });
          results.push({ success: true, fileName, document: created });
        } catch (error) {
          results.push({
            success: false,
            fileName,
            error: error instanceof Error ? error.message : 'No se pudo importar el archivo.',
          });
        }
      }
      return results;
    },
  );
  handle(IPC_CHANNELS.documents.update, (id: string, input: DocumentUpdateInput) => documents.update(id, input));
  handle(IPC_CHANNELS.documents.move, (id: string, folderId: string | null) => documents.move(id, folderId));
  handle(IPC_CHANNELS.documents.remove, (id: string) => {
    const removed = documents.remove(id);
    deleteDocumentFile(documentsDir, removed.internalPath);
  });
  handle(IPC_CHANNELS.documents.registerOpen, (id: string) => documents.registerOpen(id));
  handle(IPC_CHANNELS.documents.registerStudy, (id: string) => documents.registerStudy(id));
  handle(IPC_CHANNELS.documents.setLastPage, (id: string, page: number) => documents.setLastPage(id, page));

  // ---- Notas ----
  handle(IPC_CHANNELS.notes.listBySubject, (subjectId: string) => notes.listBySubject(subjectId));
  handle(IPC_CHANNELS.notes.listByDocument, (documentId: string) => notes.listByDocument(documentId));
  handle(IPC_CHANNELS.notes.create, (input: NoteInput) => notes.create(input));
  handle(IPC_CHANNELS.notes.update, (id: string, input: Partial<NoteInput>) => notes.update(id, input));
  handle(IPC_CHANNELS.notes.remove, (id: string) => notes.remove(id));

  // ---- Marcadores ----
  handle(IPC_CHANNELS.bookmarks.listByDocument, (documentId: string) => bookmarks.listByDocument(documentId));
  handle(IPC_CHANNELS.bookmarks.create, (input: BookmarkInput) => bookmarks.create(input));
  handle(IPC_CHANNELS.bookmarks.update, (id: string, input: Partial<BookmarkInput>) => bookmarks.update(id, input));
  handle(IPC_CHANNELS.bookmarks.remove, (id: string) => bookmarks.remove(id));

  // ---- Tareas ----
  handle(IPC_CHANNELS.tasks.listBySubject, (subjectId: string, filters?: TaskFilters) =>
    tasks.listBySubject(subjectId, filters),
  );
  handle(IPC_CHANNELS.tasks.listAll, (filters?: TaskFilters) => tasks.listAll(filters));
  handle(IPC_CHANNELS.tasks.create, (input: TaskInput) => tasks.create(input));
  handle(IPC_CHANNELS.tasks.update, (id: string, input: Partial<TaskInput>) => tasks.update(id, input));
  handle(IPC_CHANNELS.tasks.setCompleted, (id: string, completed: boolean) => tasks.setCompleted(id, completed));
  handle(IPC_CHANNELS.tasks.remove, (id: string) => tasks.remove(id));

  // ---- Eventos académicos ----
  handle(IPC_CHANNELS.events.list, (range?: AgendaRange) => events.list(range));
  handle(IPC_CHANNELS.events.create, (input: EventInput) => events.create(input));
  handle(IPC_CHANNELS.events.update, (id: string, input: Partial<EventInput>) => events.update(id, input));
  handle(IPC_CHANNELS.events.remove, (id: string) => events.remove(id));

  // ---- Sesiones de estudio ----
  handle(IPC_CHANNELS.studySessions.create, (input: StudySessionInput) => studySessions.create(input));
  handle(IPC_CHANNELS.studySessions.listBySubject, (subjectId: string) => studySessions.listBySubject(subjectId));

  // ---- Ajustes ----
  handle(IPC_CHANNELS.settings.get, () => settings.get());
  handle(IPC_CHANNELS.settings.update, (input: AppSettingsInput) => settings.update(input));

  // ---- Estadísticas ----
  handle(IPC_CHANNELS.stats.summary, (period: StatsPeriod) => stats.summary(period));

  // ---- Inicio ----
  handle(IPC_CHANNELS.home.summary, (): HomeSummary => {
    const pendingTasks = tasks.listAll({ status: 'pending' }).slice(0, 6);
    const now = new Date().toISOString();
    const upcomingEvents = events.list({ from: now }).slice(0, 6);
    const recentSubjects = subjects
      .listWithStats(false)
      .filter((s) => s.lastAccessedAt)
      .sort((a, b) => (b.lastAccessedAt ?? '').localeCompare(a.lastAccessedAt ?? ''))
      .slice(0, 4);
    const recentDocuments = documents
      .listLibrary({ sortBy: 'lastOpenedAt' })
      .filter((d) => d.lastOpenedAt)
      .slice(0, 5);
    const weekSummary = stats.summary('week');
    return {
      pendingTasks,
      upcomingEvents,
      recentSubjects,
      recentDocuments,
      weeklyStudySeconds: weekSummary.totalStudySeconds,
      weeklyGoalSeconds: 10 * 3600,
    };
  });

  // ---- Sistema ----
  handle(IPC_CHANNELS.system.openExternal, (url: string) => shell.openExternal(url));
  handle(IPC_CHANNELS.system.notify, (title: string, body: string) => {
    if (Notification.isSupported()) new Notification({ title, body }).show();
  });

  // ---- Tiempo ----
  handle(IPC_CHANNELS.weather.current, (city: string) => fetchWeather(typeof city === 'string' ? city : ''));

  // ---- Monitor del equipo ----
  // Salvo runQuickAction, ninguno acepta parámetros: el renderer solo puede pedir la foto completa,
  // nunca consultar rutas ni procesos concretos del equipo. runQuickAction recibe un identificador
  // que se valida contra una lista blanca fija; no hay forma de enviar un comando desde la interfaz.
  handle(IPC_CHANNELS.monitor.snapshot, () => getSystemSnapshot());
  handle(IPC_CHANNELS.monitor.sample, () => getSystemSample());
  handle(IPC_CHANNELS.monitor.report, () => getSystemReport());
  handle(IPC_CHANNELS.monitor.storageUsage, () => getStorageUsage(ctx.userDataDir));
  handle(IPC_CHANNELS.monitor.quickActions, () => listQuickActions());
  handle(IPC_CHANNELS.monitor.runQuickAction, (id: string) => runQuickAction(id, ctx.userDataDir));
  handle(IPC_CHANNELS.monitor.latency, () => measureLatency());
}
