import { useEffect, useState } from 'react';
import type { SubjectWithStats } from '@shared/types';
import { usePomodoro } from '../../contexts/PomodoroContext';
import { Icon } from '../ui/Icon';
import { formatClock } from '../../lib/format';
import styles from './PomodoroMiniWidget.module.css';

const MODE_LABEL = { focus: 'Concentración', short_break: 'Descanso corto', long_break: 'Descanso largo' } as const;

export function PomodoroMiniWidget() {
  const pomodoro = usePomodoro();
  const [subjects, setSubjects] = useState<SubjectWithStats[]>([]);

  useEffect(() => {
    window.api.subjects.list(false).then(setSubjects);
  }, []);

  if (!pomodoro.loaded) return null;

  const progress = pomodoro.totalSeconds > 0 ? 1 - pomodoro.remainingSeconds / pomodoro.totalSeconds : 0;

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <span className={styles.modeLabel}>{MODE_LABEL[pomodoro.mode]}</span>
        <span className={styles.cycle}>
          {pomodoro.cyclesCompleted % pomodoro.cyclesPerLongBreak}/{pomodoro.cyclesPerLongBreak}
        </span>
      </div>
      <div className={styles.clock}>{formatClock(pomodoro.remainingSeconds)}</div>
      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>

      {pomodoro.status === 'idle' && (
        <select
          className={styles.subjectSelect}
          value={pomodoro.subjectId ?? ''}
          onChange={(e) => pomodoro.setSelection(e.target.value || null, null)}
          aria-label="Asignatura para esta sesión"
        >
          <option value="">Sin asignatura</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      )}

      <div className={styles.controls}>
        {pomodoro.status === 'running' ? (
          <button onClick={pomodoro.pause} title="Pausar (Espacio)" aria-label="Pausar">
            <Icon name="pause" size={15} />
          </button>
        ) : (
          <button onClick={pomodoro.start} title="Iniciar (Espacio)" aria-label="Iniciar">
            <Icon name="play" size={15} filled />
          </button>
        )}
        <button onClick={pomodoro.reset} title="Reiniciar" aria-label="Reiniciar">
          <Icon name="rotate-ccw" size={15} />
        </button>
        <button onClick={pomodoro.finishPhase} title="Terminar fase" aria-label="Terminar fase">
          <Icon name="skip-forward" size={15} filled />
        </button>
      </div>
    </div>
  );
}
