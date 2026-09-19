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

// ---- Monitor del equipo ----
// Todas estas métricas se leen en local, se muestran en pantalla y no se guardan ni se envían
// a ningún servicio externo.
//
// Están separadas en tres grupos según lo que cuesta obtenerlas, porque de ahí sale el ritmo al
// que cada pantalla puede pedirlas:
//   · SystemSnapshot  — solo APIs de Node y Electron, ~1 ms. Se puede pedir cada segundo.
//   · SystemSample    — obliga a lanzar una utilidad del sistema, ~500 ms. Solo las pantallas
//                       que de verdad lo muestran, y a un ritmo más lento.
//   · SystemReport    — datos que no cambian mientras la aplicación está abierta. Una sola vez.

export interface SystemInfo {
  /** Nombre legible del sistema operativo, p. ej. "Windows 11 Pro". */
  osName: string;
  osRelease: string;
  arch: string;
  hostname: string;
  cpuModel: string;
  /** Número de núcleos lógicos (hilos) que expone el sistema. */
  cpuCount: number;
  /** Frecuencia declarada por el sistema en MHz, o null si no la informa. */
  cpuSpeedMhz: number | null;
}

export interface SystemCpu {
  /** null en la primera muestra, cuando todavía no hay dos lecturas que comparar. */
  usagePercent: number | null;
  /** Uso de cada núcleo lógico, en el mismo orden que los enumera el sistema. */
  perCorePercent: number[] | null;
}

export interface SystemMemory {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usagePercent: number;
}

export interface SystemDisk {
  /** Raíz de la unidad o punto de montaje, p. ej. "C:\\" o "/". */
  mount: string;
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usagePercent: number;
}

export type NetworkKind = 'wifi' | 'ethernet' | 'other';

export interface SystemNetwork {
  /** Nombre del adaptador activo, p. ej. "Wi-Fi" o "Ethernet". */
  interfaceName: string | null;
  /** Deducido del nombre del adaptador; null si no se reconoce. */
  kind: NetworkKind | null;
  /** Dirección del equipo dentro de su propia red. Nunca sale de aquí. */
  localIp: string | null;
  /** null cuando la plataforma no expone contadores de bytes, o en la primera muestra. */
  downloadBytesPerSecond: number | null;
  uploadBytesPerSecond: number | null;
  /** Bytes acumulados desde que se abrió la aplicación. */
  sessionReceivedBytes: number | null;
  sessionSentBytes: number | null;
}

export interface SystemDisplay {
  id: number;
  width: number;
  height: number;
  scaleFactor: number;
  /** Hz, o null si el sistema no lo informa. */
  refreshRate: number | null;
  primary: boolean;
}

export interface SystemSnapshot {
  info: SystemInfo;
  cpu: SystemCpu;
  memory: SystemMemory;
  disks: SystemDisk[];
  network: SystemNetwork;
  uptimeSeconds: number;
  /** null = no se ha podido determinar si el equipo tiene batería. */
  hasBattery: boolean | null;
  sampledAt: string;
}

export interface SystemProcess {
  pid: number;
  name: string;
  /** null hasta que hay dos muestras seguidas del mismo proceso. */
  cpuPercent: number | null;
  memoryBytes: number;
  /** Lectura + escritura en bytes/s. null donde la plataforma no lo expone. */
  diskBytesPerSecond: number | null;
}

export interface SystemDiskActivity {
  readBytesPerSecond: number | null;
  writeBytesPerSecond: number | null;
}

export interface SystemGpuLoad {
  /** Uso del motor 3D en porcentaje, o null si no puede medirse de forma fiable. */
  usagePercent: number | null;
  dedicatedMemoryBytes: number | null;
}

/** Muestra cara: obliga a lanzar una utilidad del sistema (~500 ms en Windows). */
export interface SystemSample {
  processes: SystemProcess[];
  disk: SystemDiskActivity;
  gpu: SystemGpuLoad;
  /** Memoria usada como caché de archivos. null donde el sistema no lo expone. */
  memoryCacheBytes: number | null;
  sampledAt: string;
}

/** Datos de batería obtenidos en el renderer con la API estándar del navegador. */
export interface BatteryStatus {
  /** Carga actual entre 0 y 1. */
  level: number;
  charging: boolean;
  chargingSecondsLeft: number | null;
  dischargingSecondsLeft: number | null;
}

// ---- Informe del equipo (una sola consulta por sesión) ----

export interface SystemVolumeInfo {
  /** Coincide con SystemDisk.mount para poder cruzarlos. */
  mount: string;
  label: string | null;
  fileSystem: string | null;
  /** "Fixed", "Removable", "Network"… tal como lo clasifica el sistema. */
  driveType: string | null;
  /** "SSD", "HDD"… null si no se puede saber. */
  mediaType: string | null;
  busType: string | null;
  model: string | null;
}

export interface SystemAntivirus {
  name: string;
  /** null = el sistema informa del producto pero no de su estado. */
  enabled: boolean | null;
  upToDate: boolean | null;
  updatedAt: string | null;
}

export interface SystemSecurity {
  /** Vacío si la plataforma no expone un centro de seguridad consultable. */
  antivirus: SystemAntivirus[];
  firewall: { profile: string; enabled: boolean }[];
}

export interface SystemGpuInfo {
  name: string;
  driverVersion: string | null;
  resolution: string | null;
  refreshHz: number | null;
}

export interface SystemHardware {
  manufacturer: string | null;
  model: string | null;
  baseboard: string | null;
  bios: string | null;
  /** Núcleos físicos, frente a SystemInfo.cpuCount que son los lógicos. */
  cpuCores: number | null;
  cpuMaxMhz: number | null;
  gpus: SystemGpuInfo[];
  memoryModules: { capacityBytes: number; speedMhz: number | null; manufacturer: string | null }[];
  audioDevices: string[];
  displays: SystemDisplay[];
}

export interface SystemReport {
  hardware: SystemHardware;
  security: SystemSecurity;
  volumes: SystemVolumeInfo[];
  /** Puerta de enlace y red Wi-Fi actuales. Solo para mostrarlas aquí. */
  gateway: string | null;
  ssid: string | null;
  /** Explicaciones en lenguaje claro de lo que no ha podido leerse en este equipo. */
  notes: string[];
}

/** Espacio que ocupa Nexus Study en el disco. Se calcula solo cuando se pide. */
export interface SystemStorageUsage {
  dataDir: string;
  documentsBytes: number;
  databaseBytes: number;
  otherBytes: number;
  documentCount: number;
}

// ---- Acciones rápidas ----
// El renderer solo puede pedir un identificador de esta lista; nunca un comando.

export interface SystemQuickAction {
  id: string;
  label: string;
  /** Qué abrirá exactamente, para mostrarlo antes de pulsar. */
  description: string;
  icon: string;
}

export interface SystemLatency {
  /** Qué se ha medido, para que quede claro que no se contacta con ningún servicio externo. */
  target: string;
  averageMs: number | null;
  error?: string;
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
