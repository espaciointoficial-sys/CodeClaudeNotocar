// Tipos compartidos entre proceso principal, preload y renderer.
// Todas las fechas se representan como cadenas ISO 8601 (UTC).

export type SubjectStatus = 'active' | 'archived';

export interface Subject {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  professor: string | null;
  term: string | null;
  description: string | null;
  status: SubjectStatus;
  position: number;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string | null;
}

export interface SubjectInput {
  name: string;
  color: string;
  icon?: string | null;
  professor?: string | null;
  term?: string | null;
  description?: string | null;
}

export interface SubjectWithStats extends Subject {
  documentCount: number;
  pendingTaskCount: number;
  nextEventAt: string | null;
  nextEventTitle: string | null;
}

export interface Folder {
  id: string;
  subjectId: string;
  name: string;
  description: string | null;
  position: number;
  createdAt: string;
}

export interface FolderInput {
  subjectId: string;
  name: string;
  description?: string | null;
}

export const ALLOWED_DOCUMENT_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp'] as const;
export type DocumentFileType = (typeof ALLOWED_DOCUMENT_EXTENSIONS)[number];

export interface DocumentItem {
  id: string;
  subjectId: string;
  folderId: string | null;
  title: string;
  originalName: string;
  internalPath: string;
  fileType: DocumentFileType;
  sizeBytes: number;
  pageCount: number | null;
  tags: string[];
  description: string | null;
  isFavorite: boolean;
  importedAt: string;
  lastOpenedAt: string | null;
  lastStudiedAt: string | null;
  openCount: number;
  lastPage: number;
}

export interface DocumentInput {
  subjectId: string;
  folderId?: string | null;
  title?: string;
  description?: string | null;
  tags?: string[];
}

export interface DocumentUpdateInput {
  title?: string;
  folderId?: string | null;
  description?: string | null;
  tags?: string[];
  isFavorite?: boolean;
}

export interface ImportResult {
  success: boolean;
  fileName: string;
  document?: DocumentItem;
  error?: string;
}

export interface Note {
  id: string;
  subjectId: string;
  documentId: string | null;
  title: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteInput {
  subjectId: string;
  documentId?: string | null;
  title?: string | null;
  content: string;
}

export interface Bookmark {
  id: string;
  documentId: string;
  page: number;
  label: string | null;
  note: string | null;
  createdAt: string;
}

export interface BookmarkInput {
  documentId: string;
  page: number;
  label?: string | null;
  note?: string | null;
}

export type TaskStatus = 'pending' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface StudyTask {
  id: string;
  subjectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface TaskInput {
  subjectId: string;
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  dueDate?: string | null;
}

export type AcademicEventType = 'exam' | 'assignment' | 'class' | 'study_session' | 'other';

export interface AcademicEvent {
  id: string;
  subjectId: string | null;
  title: string;
  type: AcademicEventType;
  startAt: string;
  endAt: string | null;
  description: string | null;
}

export interface EventInput {
  subjectId?: string | null;
  title: string;
  type: AcademicEventType;
  startAt: string;
  endAt?: string | null;
  description?: string | null;
}

export type StudySessionType = 'pomodoro' | 'free_reading' | 'review' | 'other';

export interface StudySession {
  id: string;
  subjectId: string | null;
  documentId: string | null;
  durationSeconds: number;
  startedAt: string;
  endedAt: string;
  type: StudySessionType;
}

export interface StudySessionInput {
  subjectId?: string | null;
  documentId?: string | null;
  durationSeconds: number;
  startedAt: string;
  endedAt: string;
  type: StudySessionType;
}

export type ThemePreference = 'light' | 'dark' | 'system';

export interface WidgetPreferences {
  summary: boolean;
  weather: boolean;
  gmail: boolean;
  discord: boolean;
  pinterest: boolean;
}

export interface AppSettings {
  theme: ThemePreference;
  pomodoroFocusMinutes: number;
  pomodoroShortBreakMinutes: number;
  pomodoroLongBreakMinutes: number;
  pomodoroCycles: number;
  notificationsEnabled: boolean;
  widgets: WidgetPreferences;
  /** Ciudad usada para el widget de tiempo (Open-Meteo). Null = widget sin configurar. */
  weatherCity: string | null;
}

export type AppSettingsInput = Partial<AppSettings>;

export interface WeatherResult {
  ok: boolean;
  cityLabel?: string;
  temperature?: number;
  weatherCode?: number;
  error?: string;
}

// ---- Filtros de consulta ----

export interface DocumentFilters {
  subjectId?: string;
  folderId?: string | null;
  fileType?: DocumentFileType;
  favoritesOnly?: boolean;
  search?: string;
  sortBy?: 'name' | 'importedAt' | 'lastOpenedAt' | 'favorite';
}

export interface LibraryFilters extends Omit<DocumentFilters, 'sortBy'> {
  sortBy?: 'relevance' | 'lastOpenedAt' | 'importedAt' | 'name';
}

export interface TaskFilters {
  subjectId?: string;
  status?: TaskStatus | 'overdue' | 'upcoming' | 'all';
}

export interface AgendaRange {
  from?: string;
  to?: string;
  subjectId?: string;
  type?: AcademicEventType;
}

export type StatsPeriod = 'week' | 'month' | 'all';

export interface StudyTimeByDay {
  date: string;
  seconds: number;
}

export interface StudyTimeBySubject {
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  seconds: number;
}

export interface MostOpenedDocument {
  documentId: string;
  title: string;
  subjectName: string;
  openCount: number;
}

export interface StatsSummary {
  totalStudySeconds: number;
  studyTimeByDay: StudyTimeByDay[];
  studyTimeBySubject: StudyTimeBySubject[];
  tasksCompleted: number;
  tasksTotal: number;
  mostOpenedDocuments: MostOpenedDocument[];
  currentStreakDays: number;
}

export interface HomeSummary {
  pendingTasks: StudyTask[];
  upcomingEvents: AcademicEvent[];
  recentSubjects: Subject[];
  recentDocuments: DocumentItem[];
  weeklyStudySeconds: number;
  weeklyGoalSeconds: number;
}

// ---- Actualizaciones de la aplicación ----

export type UpdateState =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'error'
  | 'disabled-dev';

export interface UpdateStatus {
  state: UpdateState;
  /** Versión de la aplicación actualmente en ejecución. */
  currentVersion: string;
  /** Versión detectada como disponible o ya descargada, si aplica. */
  availableVersion?: string;
  /** Progreso de descarga (0-100), presente solo mientras state === 'downloading'. */
  percent?: number;
  releaseNotes?: string | null;
  /** Mensaje de error en lenguaje claro, listo para mostrar al usuario. */
  error?: string;
  lastCheckedAt?: string | null;
}
