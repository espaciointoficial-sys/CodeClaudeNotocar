import { useCallback, useEffect, useState } from 'react';
import type { View } from '../App';
import { usePomodoro } from '../contexts/PomodoroContext';
import { Sidebar } from '../components/layout/Sidebar';
import { Home } from '../pages/Home';
import { Subjects } from '../pages/Subjects';
import { SubjectDetail } from '../pages/SubjectDetail';
import { Library } from '../pages/Library';
import { Agenda } from '../pages/Agenda';
import { Statistics } from '../pages/Statistics';
import { Weather } from '../pages/Weather';
import { Dashboard } from '../pages/Dashboard';
import { Settings } from '../pages/Settings';
import styles from '../App.module.css';

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
}

/**
 * Atajos globales de teclado. Va en su propio componente porque consumir el contexto del Pomodoro
 * obliga a repintar cada segundo mientras el temporizador corre: aislado aquí, ese repintado no
 * arrastra a la página completa.
 */
function GlobalHotkeys({ onNavigate, active }: { onNavigate: (view: View) => void; active: boolean }) {
  const pomodoro = usePomodoro();

  useEffect(() => {
    // Con el espacio Estudio en segundo plano no debe responder a las teclas: la barra espaciadora
    // pertenece a la pantalla que el usuario está mirando.
    if (!active) return;
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        onNavigate({ name: 'subjects', openCreateToken: Date.now() });
        return;
      }
      if (isTypingTarget(e.target)) return;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onNavigate({ name: 'library', searchFocus: true });
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
  }, [pomodoro, onNavigate, active]);

  return null;
}

/**
 * Espacio Estudio: toda la aplicación académica, con su navegación de siempre.
 *
 * Cuando `active` es falso el espacio se oculta con CSS en vez de desmontarse. Esa es la razón de
 * que cambiar de espacio no pierda nada: un formulario a medio escribir, una importación en marcha
 * o la posición de la lista siguen exactamente donde estaban al volver.
 */
export function StudyWorkspace({ active, onExitSpace }: { active: boolean; onExitSpace: () => void }) {
  const [view, setView] = useState<View>({ name: 'home' });
  const navigate = useCallback((next: View) => setView(next), []);

  return (
    <div className={`${styles.shell} ${active ? '' : styles.hidden}`}>
      <GlobalHotkeys onNavigate={navigate} active={active} />
      <Sidebar activeView={view.name} onNavigate={navigate} onExitSpace={onExitSpace} />
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
    </div>
  );
}
