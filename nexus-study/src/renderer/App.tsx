import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { PomodoroProvider } from './contexts/PomodoroContext';
import { ViewerProvider, useViewer } from './contexts/ViewerContext';
import { UpdateReadyBanner } from './components/updates/UpdateReadyBanner';
import { SpaceSelector } from './spaces/SpaceSelector';

// El visor arrastra pdf.js (~1,4 MB). Cargándolo aparte, el arranque no paga ese coste hasta que
// se abre el primer documento; el visor ya se pintaba en blanco mientras cargaba el archivo, así
// que el retardo del import no cambia nada visible.
const DocumentViewerModal = lazy(() =>
  import('./components/viewer/DocumentViewerModal').then((module) => ({ default: module.DocumentViewerModal })),
);

// Los dos espacios se cargan aparte por el mismo motivo: al abrir la aplicación solo se ve el
// selector, así que no tiene sentido analizar el código de ninguno de los dos hasta que se entra.
const StudyWorkspace = lazy(() =>
  import('./spaces/StudyWorkspace').then((module) => ({ default: module.StudyWorkspace })),
);
const SystemWorkspace = lazy(() =>
  import('./system/SystemWorkspace').then((module) => ({ default: module.SystemWorkspace })),
);

export type SubjectTab = 'documents' | 'notes' | 'tasks' | 'calendar' | 'progress';

/** Pantallas del espacio Estudio. El espacio Sistema tiene su propia navegación, aparte. */
export type View =
  | { name: 'home' }
  | { name: 'subjects'; openCreateToken?: number }
  | { name: 'subjectDetail'; subjectId: string; tab?: SubjectTab }
  | { name: 'library'; searchFocus?: boolean }
  | { name: 'agenda' }
  | { name: 'stats' }
  | { name: 'weather' }
  | { name: 'dashboard' }
  | { name: 'settings' };

type Space = 'selector' | 'study' | 'system';

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
}

/**
 * Enrutado entre los dos espacios de trabajo.
 *
 * Cada espacio se monta la primera vez que se entra en él y a partir de ahí se queda montado,
 * oculto con CSS mientras no es el activo. Así cambiar de espacio conserva todo lo que había en
 * marcha —formularios, importaciones, la pantalla en la que estabas— y el Pomodoro, que vive por
 * encima de los dos, sigue corriendo pase lo que pase. El coste de un espacio oculto es nulo: el
 * navegador no pinta lo que está en display:none, y el monitor del sistema detiene sus consultas
 * en cuanto deja de estar activo.
 */
function AppShell() {
  const [space, setSpace] = useState<Space>('selector');
  const [visited, setVisited] = useState({ study: false, system: false });
  const { openDocumentId } = useViewer();

  const openSpace = useCallback((next: 'study' | 'system') => {
    setVisited((current) => (current[next] ? current : { ...current, [next]: true }));
    setSpace(next);
  }, []);

  const backToSelector = useCallback(() => setSpace('selector'), []);

  useEffect(() => {
    if (space === 'selector') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      // El visor y los diálogos también se cierran con Escape y tienen prioridad: primero se sale
      // de lo que esté abierto encima y solo después del espacio.
      if (openDocumentId || document.querySelector('[role="dialog"]')) return;
      // Escribiendo en un campo, Escape es para el campo; sacar al usuario del espacio a media
      // frase sería justo lo contrario de conservar su trabajo.
      if (isTypingTarget(event.target)) return;
      setSpace('selector');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [space, openDocumentId]);

  return (
    <>
      {space === 'selector' && <SpaceSelector onOpen={openSpace} />}
      {visited.study && (
        <Suspense fallback={null}>
          <StudyWorkspace active={space === 'study'} onExitSpace={backToSelector} />
        </Suspense>
      )}
      {visited.system && (
        <Suspense fallback={null}>
          <SystemWorkspace active={space === 'system'} onExitSpace={backToSelector} />
        </Suspense>
      )}
      {openDocumentId && (
        <Suspense fallback={null}>
          <DocumentViewerModal documentId={openDocumentId} />
        </Suspense>
      )}
      <UpdateReadyBanner />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ViewerProvider>
          <PomodoroProvider>
            <AppShell />
          </PomodoroProvider>
        </ViewerProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
