import { useCallback, useEffect, useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { PomodoroProvider, usePomodoro } from './contexts/PomodoroContext';
import { ViewerProvider, useViewer } from './contexts/ViewerContext';
import { Sidebar } from './components/layout/Sidebar';
import { DocumentViewerModal } from './components/viewer/DocumentViewerModal';
import { UpdateReadyBanner } from './components/updates/UpdateReadyBanner';
import { Home } from './pages/Home';
import { Subjects } from './pages/Subjects';
import { SubjectDetail } from './pages/SubjectDetail';
import { Library } from './pages/Library';
import { Agenda } from './pages/Agenda';
import { Statistics } from './pages/Statistics';
import { Weather } from './pages/Weather';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import styles from './App.module.css';

export type SubjectTab = 'documents' | 'notes' | 'tasks' | 'calendar' | 'progress';

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

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
}

function AppShell() {
  const [view, setView] = useState<View>({ name: 'home' });
  const pomodoro = usePomodoro();
  const { openDocumentId } = useViewer();

  const navigate = useCallback((next: View) => setView(next), []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setView({ name: 'subjects', openCreateToken: Date.now() });
        return;
      }
      if (isTypingTarget(e.target)) return;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setView({ name: 'library', searchFocus: true });
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (pomodoro.status === 'running') pomodoro.pause();
        else pomodoro.start();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pomodoro]);

  return (
    <div className={styles.shell}>
      <Sidebar activeView={view.name} onNavigate={navigate} />
      <main className={styles.content}>
        {view.name === 'home' && <Home onNavigate={navigate} />}
        {view.name === 'subjects' && <Subjects onNavigate={navigate} openCreateToken={view.openCreateToken} />}
        {view.name === 'subjectDetail' && (
          <SubjectDetail key={view.subjectId} subjectId={view.subjectId} initialTab={view.tab} onNavigate={navigate} />
        )}
        {view.name === 'library' && <Library focusSearch={view.searchFocus} />}
        {view.name === 'agenda' && <Agenda />}
        {view.name === 'stats' && <Statistics />}
        {view.name === 'weather' && <Weather />}
        {view.name === 'dashboard' && <Dashboard />}
        {view.name === 'settings' && <Settings />}
      </main>
      {openDocumentId && <DocumentViewerModal documentId={openDocumentId} />}
      <UpdateReadyBanner />
    </div>
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
