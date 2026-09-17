// Contrato de la API expuesta por el proceso principal al renderer a través del preload.
// Cada método corresponde a un canal IPC con el mismo nombre (ver IPC_CHANNELS).
import type {
  AcademicEvent,
  AgendaRange,
  AppSettings,
  AppSettingsInput,
  Bookmark,
  BookmarkInput,
  DocumentFilters,
  DocumentInput,
  DocumentItem,
  DocumentUpdateInput,
  EventInput,
  Folder,
  FolderInput,
  HomeSummary,
  ImportResult,
  LibraryFilters,
  Note,
  NoteInput,
  StatsPeriod,
  StatsSummary,
  StudySession,
  StudySessionInput,
  StudyTask,
  Subject,
  SubjectInput,
  SubjectWithStats,
  TaskFilters,
  TaskInput,
  UpdateStatus,
  WeatherResult,
} from './types';

export interface NexusApi {
  subjects: {
    list: (includeArchived?: boolean) => Promise<SubjectWithStats[]>;
    get: (id: string) => Promise<Subject | null>;
    create: (input: SubjectInput) => Promise<Subject>;
    update: (id: string, input: Partial<SubjectInput>) => Promise<Subject>;
    setArchived: (id: string, archived: boolean) => Promise<Subject>;
    reorder: (orderedIds: string[]) => Promise<void>;
    remove: (id: string) => Promise<void>;
    touchAccessed: (id: string) => Promise<void>;
  };
  folders: {
    listBySubject: (subjectId: string) => Promise<Folder[]>;
    create: (input: FolderInput) => Promise<Folder>;
    update: (id: string, input: Partial<FolderInput>) => Promise<Folder>;
    remove: (id: string) => Promise<void>;
  };
  documents: {
    listBySubject: (subjectId: string, filters?: DocumentFilters) => Promise<DocumentItem[]>;
    listLibrary: (filters?: LibraryFilters) => Promise<DocumentItem[]>;
    get: (id: string) => Promise<DocumentItem | null>;
    chooseFiles: () => Promise<string[]>;
    importFiles: (subjectId: string, filePaths: string[], input?: DocumentInput) => Promise<ImportResult[]>;
    update: (id: string, input: DocumentUpdateInput) => Promise<DocumentItem>;
    move: (id: string, folderId: string | null) => Promise<DocumentItem>;
    remove: (id: string) => Promise<void>;
    registerOpen: (id: string) => Promise<DocumentItem>;
    registerStudy: (id: string) => Promise<void>;
    setLastPage: (id: string, page: number) => Promise<void>;
  };
  notes: {
    listBySubject: (subjectId: string) => Promise<Note[]>;
    listByDocument: (documentId: string) => Promise<Note[]>;
    create: (input: NoteInput) => Promise<Note>;
    update: (id: string, input: Partial<NoteInput>) => Promise<Note>;
    remove: (id: string) => Promise<void>;
  };
  bookmarks: {
    listByDocument: (documentId: string) => Promise<Bookmark[]>;
    create: (input: BookmarkInput) => Promise<Bookmark>;
    update: (id: string, input: Partial<BookmarkInput>) => Promise<Bookmark>;
    remove: (id: string) => Promise<void>;
  };
  tasks: {
    listBySubject: (subjectId: string, filters?: TaskFilters) => Promise<StudyTask[]>;
    listAll: (filters?: TaskFilters) => Promise<StudyTask[]>;
    create: (input: TaskInput) => Promise<StudyTask>;
    update: (id: string, input: Partial<TaskInput>) => Promise<StudyTask>;
    setCompleted: (id: string, completed: boolean) => Promise<StudyTask>;
    remove: (id: string) => Promise<void>;
  };
  events: {
    list: (range?: AgendaRange) => Promise<AcademicEvent[]>;
    create: (input: EventInput) => Promise<AcademicEvent>;
    update: (id: string, input: Partial<EventInput>) => Promise<AcademicEvent>;
    remove: (id: string) => Promise<void>;
  };
  studySessions: {
    create: (input: StudySessionInput) => Promise<StudySession>;
    listBySubject: (subjectId: string) => Promise<StudySession[]>;
  };
  settings: {
    get: () => Promise<AppSettings>;
    update: (input: AppSettingsInput) => Promise<AppSettings>;
  };
  stats: {
    summary: (period: StatsPeriod) => Promise<StatsSummary>;
  };
  home: {
    summary: () => Promise<HomeSummary>;
  };
  system: {
    openExternal: (url: string) => Promise<void>;
    notify: (title: string, body: string) => Promise<void>;
  };
  weather: {
    current: (city: string) => Promise<WeatherResult>;
  };
  updates: {
    getStatus: () => Promise<UpdateStatus>;
    check: () => Promise<UpdateStatus>;
    install: () => Promise<void>;
    /** Se invoca con cada cambio de estado; devuelve una función para dejar de escuchar. */
    onStatusChange: (callback: (status: UpdateStatus) => void) => () => void;
  };
}

/** Nombres de canal IPC, agrupados igual que la interfaz NexusApi (dominio:accion). */
export const IPC_CHANNELS = {
  subjects: {
    list: 'subjects:list',
    get: 'subjects:get',
    create: 'subjects:create',
    update: 'subjects:update',
    setArchived: 'subjects:setArchived',
    reorder: 'subjects:reorder',
    remove: 'subjects:remove',
    touchAccessed: 'subjects:touchAccessed',
  },
  folders: {
    listBySubject: 'folders:listBySubject',
    create: 'folders:create',
    update: 'folders:update',
    remove: 'folders:remove',
  },
  documents: {
    listBySubject: 'documents:listBySubject',
    listLibrary: 'documents:listLibrary',
    get: 'documents:get',
    chooseFiles: 'documents:chooseFiles',
    importFiles: 'documents:importFiles',
    update: 'documents:update',
    move: 'documents:move',
    remove: 'documents:remove',
    registerOpen: 'documents:registerOpen',
    registerStudy: 'documents:registerStudy',
    setLastPage: 'documents:setLastPage',
  },
  notes: {
    listBySubject: 'notes:listBySubject',
    listByDocument: 'notes:listByDocument',
    create: 'notes:create',
    update: 'notes:update',
    remove: 'notes:remove',
  },
  bookmarks: {
    listByDocument: 'bookmarks:listByDocument',
    create: 'bookmarks:create',
    update: 'bookmarks:update',
    remove: 'bookmarks:remove',
  },
  tasks: {
    listBySubject: 'tasks:listBySubject',
    listAll: 'tasks:listAll',
    create: 'tasks:create',
    update: 'tasks:update',
    setCompleted: 'tasks:setCompleted',
    remove: 'tasks:remove',
  },
  events: {
    list: 'events:list',
    create: 'events:create',
    update: 'events:update',
    remove: 'events:remove',
  },
  studySessions: {
    create: 'studySessions:create',
    listBySubject: 'studySessions:listBySubject',
  },
  settings: {
    get: 'settings:get',
    update: 'settings:update',
  },
  stats: {
    summary: 'stats:summary',
  },
  home: {
    summary: 'home:summary',
  },
  system: {
    openExternal: 'system:openExternal',
    notify: 'system:notify',
  },
  weather: {
    current: 'weather:current',
  },
  updates: {
    getStatus: 'updates:getStatus',
    check: 'updates:check',
    install: 'updates:install',
    statusChanged: 'updates:statusChanged',
  },
} as const;
