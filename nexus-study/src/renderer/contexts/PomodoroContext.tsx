import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { AppSettings } from '@shared/types';
import { useToast } from './ToastContext';

export type PomodoroMode = 'focus' | 'short_break' | 'long_break';
export type PomodoroStatus = 'idle' | 'running' | 'paused';

interface PomodoroContextValue {
  mode: PomodoroMode;
  status: PomodoroStatus;
  remainingSeconds: number;
  totalSeconds: number;
  cyclesCompleted: number;
  cyclesPerLongBreak: number;
  subjectId: string | null;
  documentId: string | null;
  setSelection: (subjectId: string | null, documentId: string | null) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  finishPhase: () => void;
  refreshSettings: () => void;
  loaded: boolean;
}

const PomodoroContext = createContext<PomodoroContextValue | null>(null);

function durationFor(mode: PomodoroMode, settings: AppSettings): number {
  if (mode === 'focus') return settings.pomodoroFocusMinutes * 60;
  if (mode === 'short_break') return settings.pomodoroShortBreakMinutes * 60;
  return settings.pomodoroLongBreakMinutes * 60;
}

const PHASE_LABEL: Record<PomodoroMode, string> = {
  focus: 'Concentración',
  short_break: 'Descanso corto',
  long_break: 'Descanso largo',
};

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [mode, setMode] = useState<PomodoroMode>('focus');
  const [status, setStatus] = useState<PomodoroStatus>('idle');
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);

  const endAtRef = useRef<number | null>(null);
  const phaseStartedAtRef = useRef<number | null>(null);

  useEffect(() => {
    window.api.settings.get().then((loaded) => {
      setSettings(loaded);
      setRemainingSeconds(durationFor('focus', loaded));
    });
  }, []);

  const logFocusSession = useCallback(
    (elapsedSeconds: number) => {
      if (elapsedSeconds < 1) return;
      const endedAt = new Date().toISOString();
      const startedAt = new Date(Date.now() - elapsedSeconds * 1000).toISOString();
      void window.api.studySessions.create({
        subjectId,
        documentId,
        durationSeconds: elapsedSeconds,
        startedAt,
        endedAt,
        type: 'pomodoro',
      });
      if (documentId) void window.api.documents.registerStudy(documentId);
    },
    [subjectId, documentId],
  );

  const advancePhase = useCallback(
    (completedMode: PomodoroMode) => {
      if (!settings) return;
      let nextMode: PomodoroMode;
      let nextCycles = cyclesCompleted;
      if (completedMode === 'focus') {
        nextCycles = cyclesCompleted + 1;
        nextMode = nextCycles % settings.pomodoroCycles === 0 ? 'long_break' : 'short_break';
      } else {
        nextMode = 'focus';
      }
      setCyclesCompleted(nextCycles);
      setMode(nextMode);
      setRemainingSeconds(durationFor(nextMode, settings));
      setStatus('idle');
      endAtRef.current = null;
      phaseStartedAtRef.current = null;

      const message = `${PHASE_LABEL[completedMode]} terminado. Siguiente: ${PHASE_LABEL[nextMode]}.`;
      showToast(message, 'success');
      if (settings.notificationsEnabled) {
        void window.api.system.notify('Nexus Study — Pomodoro', message);
      }
    },
    [settings, cyclesCompleted, showToast],
  );

  // Bucle de cuenta atrás basado en marca de tiempo absoluta, para no acumular desviación
  // si la ventana pierde foco o el intervalo se retrasa.
  useEffect(() => {
    if (status !== 'running') return;
    const interval = setInterval(() => {
      const endAt = endAtRef.current;
      if (endAt === null) return;
      const remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        if (mode === 'focus' && phaseStartedAtRef.current) {
          const elapsed = Math.round((Date.now() - phaseStartedAtRef.current) / 1000);
          logFocusSession(elapsed);
        }
        advancePhase(mode);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [status, mode, advancePhase, logFocusSession]);

  const start = useCallback(() => {
    if (!settings || status === 'running') return;
    endAtRef.current = Date.now() + remainingSeconds * 1000;
    if (!phaseStartedAtRef.current) {
      phaseStartedAtRef.current = Date.now() - (durationFor(mode, settings) - remainingSeconds) * 1000;
    }
    setStatus('running');
  }, [settings, status, remainingSeconds, mode]);

  const pause = useCallback(() => {
    if (status !== 'running' || endAtRef.current === null) return;
    setRemainingSeconds(Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000)));
    endAtRef.current = null;
    setStatus('paused');
  }, [status]);

  const reset = useCallback(() => {
    if (!settings) return;
    setStatus('idle');
    endAtRef.current = null;
    phaseStartedAtRef.current = null;
    setRemainingSeconds(durationFor(mode, settings));
  }, [settings, mode]);

  const finishPhase = useCallback(() => {
    if (mode === 'focus' && phaseStartedAtRef.current) {
      const elapsed = Math.round((Date.now() - phaseStartedAtRef.current) / 1000);
      logFocusSession(elapsed);
    }
    advancePhase(mode);
  }, [mode, logFocusSession, advancePhase]);

  const setSelection = useCallback(
    (nextSubjectId: string | null, nextDocumentId: string | null) => {
      if (status !== 'idle') return;
      setSubjectId(nextSubjectId);
      setDocumentId(nextDocumentId);
    },
    [status],
  );

  const refreshSettings = useCallback(() => {
    window.api.settings.get().then((next) => {
      setSettings(next);
      if (status === 'idle') setRemainingSeconds(durationFor(mode, next));
    });
  }, [status, mode]);

  const totalSeconds = settings ? durationFor(mode, settings) : remainingSeconds;

  return (
    <PomodoroContext.Provider
      value={{
        mode,
        status,
        remainingSeconds,
        totalSeconds,
        cyclesCompleted,
        cyclesPerLongBreak: settings?.pomodoroCycles ?? 4,
        subjectId,
        documentId,
        setSelection,
        start,
        pause,
        reset,
        finishPhase,
        refreshSettings,
        loaded: settings !== null,
      }}
    >
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoro(): PomodoroContextValue {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error('usePomodoro debe usarse dentro de PomodoroProvider.');
  return ctx;
}
