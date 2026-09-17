import { useEffect, useState } from 'react';
import type { SubjectWithStats } from '@shared/types';
import { usePomodoro } from '../../contexts/PomodoroContext';
import { Icon } from '../ui/Icon';
import { formatClock } from '../../lib/format';
import styles from './PomodoroMiniWidget.module.css';

const MODE_LABEL = { focus: 'Concentración', short_break: 'Descanso corto', long_break: 'Descanso largo' } as const;

function Ring({ radius, progress, className }: { radius: number; progress: number; className?: string }) {
  const circumference = 2 * Math.PI * radius;
  const size = radius * 2 + 6;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
      <circle cx={size / 2} cy={size / 2} r={radius} className={styles.ringTrack} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        className={styles.ringFill}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

export function PomodoroMiniWidget({ compact = false }: { compact?: boolean }) {
  const pomodoro = usePomodoro();
  const [subjects, setSubjects] = useState<SubjectWithStats[]>([]);

  useEffect(() => {
    window.api.subjects.list(false).then(setSubjects);
  }, []);

  if (!pomodoro.loaded) return null;

  const progress = pomodoro.totalSeconds > 0 ? 1 - pomodoro.remainingSeconds / pomodoro.totalSeconds : 0;
  const subjectName = subjects.find((s) => s.id === pomodoro.subjectId)?.name;
  const isRunning = pomodoro.status === 'running';

  if (compact) {
    return (
      <div
        className={styles.compactWidget}
        data-tooltip={`${MODE_LABEL[pomodoro.mode]} · ${formatClock(pomodoro.remainingSeconds)} restante`}
      >
        <Ring radius={18} progress={progress} className={styles.compactRing} />
        <button
          className={styles.compactPlay}
          onClick={isRunning ? pomodoro.pause : pomodoro.start}
          aria-label={isRunning ? 'Pausar' : 'Iniciar'}
        >
          <Icon name={isRunning ? 'pause' : 'play'} size={13} filled={!isRunning} />
        </button>
      </div>
    );
  }

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <span className={styles.modeLabel}>{MODE_LABEL[pomodoro.mode]}</span>
        <span className={styles.cycle}>
          {pomodoro.cyclesCompleted % pomodoro.cyclesPerLongBreak}/{pomodoro.cyclesPerLongBreak}
        </span>
      </div>

      <div className={styles.ringWrap}>
        <Ring radius={34} progress={progress} className={styles.ring} />
        <span className={styles.clock}>{formatClock(pomodoro.remainingSeconds)}</span>
      </div>

      {pomodoro.status === 'idle' ? (
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
      ) : (
        <p className={styles.subjectLabel}>{subjectName ?? 'Sin asignatura'}</p>
      )}

      <div className={styles.controls}>
        {isRunning ? (
          <button onClick={pomodoro.pause} data-tooltip="Pausar (Espacio)" aria-label="Pausar">
            <Icon name="pause" size={15} />
          </button>
        ) : (
          <button onClick={pomodoro.start} data-tooltip="Iniciar (Espacio)" aria-label="Iniciar">
            <Icon name="play" size={15} filled />
          </button>
        )}
        <button onClick={pomodoro.reset} data-tooltip="Reiniciar" aria-label="Reiniciar">
          <Icon name="rotate-ccw" size={15} />
        </button>
        <button onClick={pomodoro.finishPhase} data-tooltip="Terminar fase" aria-label="Terminar fase">
          <Icon name="skip-forward" size={15} filled />
        </button>
      </div>
    </div>
  );
}
