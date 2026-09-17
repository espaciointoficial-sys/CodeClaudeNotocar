import { useEffect, useState } from 'react';
import type { AppSettings, HomeSummary } from '@shared/types';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon, type IconName } from '../components/ui/Icon';
import { formatRelativeDay } from '../lib/format';
import styles from './Dashboard.module.css';

function ComingSoonCard({ icon, name, url }: { icon: IconName; name: string; url: string }) {
  return (
    <section className={styles.card}>
      <div className={styles.comingSoonHead}>
        <span className={styles.comingSoonIcon}>
          <Icon name={icon} size={20} />
        </span>
        <div>
          <h2>{name}</h2>
          <span className={styles.badgeSoon}>Próxima integración</span>
        </div>
      </div>
      <p className={styles.comingSoonText}>
        La integración con {name} todavía no está disponible dentro de Nexus Study. Puedes abrirlo en tu navegador.
      </p>
      <button className={styles.externalLink} onClick={() => void window.api.system.openExternal(url)}>
        Abrir {name}
        <Icon name="external-link" size={14} />
      </button>
    </section>
  );
}

export function Dashboard() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [summary, setSummary] = useState<HomeSummary | null>(null);

  useEffect(() => {
    window.api.settings.get().then(setSettings);
    window.api.home.summary().then(setSummary);
  }, []);

  if (!settings || !summary) return null;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Accesos complementarios. Actívalos o desactívalos desde Ajustes."
      />
      <div className="page-body">
        <div className={styles.grid}>
          {settings.widgets.summary && (
            <section className={styles.card}>
              <h2>Resumen académico</h2>
              {summary.pendingTasks.length === 0 && summary.upcomingEvents.length === 0 ? (
                <EmptyState icon="check-circle" title="Todo al día" />
              ) : (
                <ul className={styles.summaryList}>
                  {summary.pendingTasks.slice(0, 4).map((task) => (
                    <li key={task.id}>
                      <Icon name="check-circle" size={14} />
                      {task.title}
                    </li>
                  ))}
                  {summary.upcomingEvents.slice(0, 4).map((event) => (
                    <li key={event.id}>
                      <Icon name="calendar" size={14} />
                      {event.title} · {formatRelativeDay(event.startAt)}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {settings.widgets.gmail && <ComingSoonCard icon="mail" name="Gmail" url="https://mail.google.com" />}
          {settings.widgets.discord && <ComingSoonCard icon="message-circle" name="Discord" url="https://discord.com/app" />}
          {settings.widgets.pinterest && <ComingSoonCard icon="pin" name="Pinterest" url="https://www.pinterest.com" />}
        </div>
      </div>
    </div>
  );
}
