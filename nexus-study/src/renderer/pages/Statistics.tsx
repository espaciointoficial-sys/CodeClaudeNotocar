import { useEffect, useState } from 'react';
import type { StatsPeriod, StatsSummary } from '@shared/types';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { formatDate, formatDuration, pluralize } from '../lib/format';
import styles from './Statistics.module.css';

const PERIOD_LABEL: Record<StatsPeriod, string> = { week: 'Esta semana', month: 'Este mes', all: 'Todo el tiempo' };

export function Statistics() {
  const [period, setPeriod] = useState<StatsPeriod>('week');
  const [summary, setSummary] = useState<StatsSummary | null>(null);

  useEffect(() => {
    window.api.stats.summary(period).then(setSummary);
  }, [period]);

  if (!summary) return null;

  const hasAnyData = summary.totalStudySeconds > 0 || summary.tasksTotal > 0 || summary.mostOpenedDocuments.length > 0;
  const maxDaySeconds = Math.max(1, ...summary.studyTimeByDay.map((d) => d.seconds));
  const maxSubjectSeconds = Math.max(1, ...summary.studyTimeBySubject.map((s) => s.seconds));

  return (
    <div>
      <PageHeader title="Estadísticas" description="Tu progreso de estudio a lo largo del tiempo." />
      <div className="page-body">
        <div className={styles.periodSwitch}>
          {(['week', 'month', 'all'] as StatsPeriod[]).map((p) => (
            <button key={p} data-active={period === p} onClick={() => setPeriod(p)}>
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>

        {!hasAnyData ? (
          <EmptyState
            icon="bar-chart"
            title="Todavía no hay datos suficientes"
            description="Estudia con el Pomodoro, completa tareas y consulta apuntes para ver tus estadísticas aquí."
          />
        ) : (
          <div className={styles.grid}>
            <section className={styles.tile}>
              <span className={styles.tileValue}>{formatDuration(summary.totalStudySeconds)}</span>
              <span className={styles.tileLabel}>Tiempo total de estudio</span>
            </section>
            <section className={styles.tile}>
              <span className={styles.tileValue}>
                {summary.tasksCompleted}/{summary.tasksTotal}
              </span>
              <span className={styles.tileLabel}>Tareas completadas</span>
            </section>
            <section className={styles.tile}>
              <span className={styles.tileValue}>
                {summary.currentStreakDays} {pluralize(summary.currentStreakDays, 'día', 'días')}
              </span>
              <span className={styles.tileLabel}>Racha de estudio</span>
            </section>

            <section className={styles.card} style={{ gridColumn: 'span 3' }}>
              <h2>Tiempo de estudio por día</h2>
              <div className={styles.dayChart}>
                {summary.studyTimeByDay.map((day) => (
                  <div key={day.date} className={styles.dayBarWrap} title={`${formatDate(day.date)}: ${formatDuration(day.seconds)}`}>
                    <div className={styles.dayBarTrack}>
                      <div className={styles.dayBarFill} style={{ height: `${(day.seconds / maxDaySeconds) * 100}%` }} />
                    </div>
                    <span className={styles.dayLabel}>{new Date(day.date).getDate()}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.card} style={{ gridColumn: 'span 2' }}>
              <h2>Tiempo por asignatura</h2>
              {summary.studyTimeBySubject.length === 0 ? (
                <p className={styles.muted}>Aún no hay sesiones registradas.</p>
              ) : (
                <div className={styles.subjectBars}>
                  {summary.studyTimeBySubject.map((s) => (
                    <div key={s.subjectId} className={styles.subjectRow}>
                      <span className={styles.subjectName}>{s.subjectName}</span>
                      <div className={styles.subjectTrack}>
                        <div
                          className={styles.subjectFill}
                          style={{ width: `${(s.seconds / maxSubjectSeconds) * 100}%`, background: s.subjectColor }}
                        />
                      </div>
                      <span className={styles.subjectValue}>{formatDuration(s.seconds)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className={styles.card}>
              <h2>Apuntes más consultados</h2>
              {summary.mostOpenedDocuments.length === 0 ? (
                <p className={styles.muted}>Todavía no has abierto ningún apunte.</p>
              ) : (
                <ul className={styles.docList}>
                  {summary.mostOpenedDocuments.map((doc) => (
                    <li key={doc.documentId}>
                      <span>{doc.title}</span>
                      <span className={styles.muted}>{doc.openCount}×</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
