import { useEffect, useState } from 'react';
import type { AppSettings, ThemePreference, WidgetPreferences } from '@shared/types';
import { PageHeader } from '../components/layout/PageHeader';
import { FormField } from '../components/ui/FormField';
import { UpdatesSection } from '../components/settings/UpdatesSection';
import { useTheme } from '../contexts/ThemeContext';
import { usePomodoro } from '../contexts/PomodoroContext';
import { useToast } from '../contexts/ToastContext';
import styles from './Settings.module.css';

const WIDGET_LABELS: { key: keyof WidgetPreferences; label: string }[] = [
  { key: 'summary', label: 'Resumen académico' },
  { key: 'weather', label: 'Tiempo meteorológico' },
  { key: 'gmail', label: 'Gmail' },
  { key: 'discord', label: 'Discord' },
  { key: 'pinterest', label: 'Pinterest' },
];

export function Settings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [cityDraft, setCityDraft] = useState('');
  const { theme, setTheme } = useTheme();
  const pomodoro = usePomodoro();
  const { showToast } = useToast();

  useEffect(() => {
    window.api.settings.get().then((s) => {
      setSettings(s);
      setCityDraft(s.weatherCity ?? '');
    });
  }, []);

  const persist = async (patch: Partial<AppSettings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    await window.api.settings.update(patch);
    pomodoro.refreshSettings();
  };

  if (!settings) return null;

  return (
    <div>
      <PageHeader title="Ajustes" description="Personaliza la apariencia, el Pomodoro y los widgets del dashboard." />
      <div className="page-body">
        <section className={styles.section}>
          <h2>Apariencia</h2>
          <FormField label="Tema">
            <select
              className="select"
              value={theme}
              onChange={(e) => setTheme(e.target.value as ThemePreference)}
              style={{ maxWidth: 220 }}
            >
              <option value="system">Sistema</option>
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
            </select>
          </FormField>
        </section>

        <section className={styles.section}>
          <h2>Pomodoro</h2>
          <div className={styles.row}>
            <FormField label="Concentración (min)">
              <input
                type="number"
                min={1}
                className="input"
                value={settings.pomodoroFocusMinutes}
                onChange={(e) => persist({ pomodoroFocusMinutes: Number(e.target.value) || 1 })}
              />
            </FormField>
            <FormField label="Descanso corto (min)">
              <input
                type="number"
                min={1}
                className="input"
                value={settings.pomodoroShortBreakMinutes}
                onChange={(e) => persist({ pomodoroShortBreakMinutes: Number(e.target.value) || 1 })}
              />
            </FormField>
            <FormField label="Descanso largo (min)">
              <input
                type="number"
                min={1}
                className="input"
                value={settings.pomodoroLongBreakMinutes}
                onChange={(e) => persist({ pomodoroLongBreakMinutes: Number(e.target.value) || 1 })}
              />
            </FormField>
            <FormField label="Ciclos antes del descanso largo">
              <input
                type="number"
                min={1}
                className="input"
                value={settings.pomodoroCycles}
                onChange={(e) => persist({ pomodoroCycles: Number(e.target.value) || 1 })}
              />
            </FormField>
          </div>
          <FormField label="Notificaciones de escritorio">
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={settings.notificationsEnabled}
                onChange={(e) => persist({ notificationsEnabled: e.target.checked })}
              />
              Avisar cuando termine una fase del Pomodoro
            </label>
          </FormField>
        </section>

        <section className={styles.section}>
          <h2>Widgets del Dashboard</h2>
          {WIDGET_LABELS.map(({ key, label }) => (
            <label key={key} className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={settings.widgets[key]}
                onChange={(e) =>
                  persist({ widgets: { ...settings.widgets, [key]: e.target.checked } }).then(() =>
                    showToast('Preferencias de widgets actualizadas.', 'success'),
                  )
                }
              />
              {label}
            </label>
          ))}
          {settings.widgets.weather && (
            <div className={styles.subField}>
              <FormField
                label="Ciudad para el tiempo"
                htmlFor="weather-city"
                hint="Usa el servicio gratuito Open-Meteo; no requiere cuenta ni conexión permanente."
              >
                <input
                  id="weather-city"
                  className="input"
                  style={{ maxWidth: 280 }}
                  placeholder="Ej. Madrid"
                  value={cityDraft}
                  onChange={(e) => setCityDraft(e.target.value)}
                  onBlur={() => {
                    if (cityDraft.trim() !== (settings.weatherCity ?? '')) {
                      persist({ weatherCity: cityDraft.trim() || null });
                    }
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                />
              </FormField>
            </div>
          )}
        </section>

        <section className={styles.section}>
          <h2>Atajos de teclado</h2>
          <ul className={styles.shortcutList}>
            <li>
              <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>N</kbd> — Nueva asignatura
            </li>
            <li>
              <kbd>Ctrl</kbd> + <kbd>K</kbd> — Buscar en la biblioteca
            </li>
            <li>
              <kbd>Espacio</kbd> — Iniciar o pausar el Pomodoro
            </li>
            <li>
              <kbd>Esc</kbd> — Salir del modo estudio
            </li>
          </ul>
        </section>

        <UpdatesSection />
      </div>
    </div>
  );
}
