import type { DatabaseSync } from 'node:sqlite';
import type { AppSettings, AppSettingsInput, ThemePreference, WidgetPreferences } from '@shared/types';

interface SettingsRow {
  theme: ThemePreference;
  pomodoro_focus_min: number;
  pomodoro_short_break_min: number;
  pomodoro_long_break_min: number;
  pomodoro_cycles: number;
  notifications_enabled: number;
  widgets_json: string;
  weather_city: string | null;
}

const DEFAULT_WIDGETS: WidgetPreferences = {
  summary: true,
  gmail: true,
  discord: true,
  pinterest: true,
};

function rowToSettings(row: SettingsRow): AppSettings {
  let widgets: WidgetPreferences;
  try {
    widgets = { ...DEFAULT_WIDGETS, ...JSON.parse(row.widgets_json) };
  } catch {
    widgets = DEFAULT_WIDGETS;
  }
  return {
    theme: row.theme,
    pomodoroFocusMinutes: row.pomodoro_focus_min,
    pomodoroShortBreakMinutes: row.pomodoro_short_break_min,
    pomodoroLongBreakMinutes: row.pomodoro_long_break_min,
    pomodoroCycles: row.pomodoro_cycles,
    notificationsEnabled: row.notifications_enabled === 1,
    widgets,
    weatherCity: row.weather_city,
  };
}

export class SettingsRepository {
  constructor(private readonly db: DatabaseSync) {}

  get(): AppSettings {
    const row = this.db.prepare('SELECT * FROM settings WHERE id = 1').get() as unknown as SettingsRow;
    return rowToSettings(row);
  }

  update(input: AppSettingsInput): AppSettings {
    const current = this.get();
    const next: AppSettings = {
      ...current,
      ...input,
      widgets: { ...current.widgets, ...(input.widgets ?? {}) },
    };
    if (next.pomodoroFocusMinutes < 1 || next.pomodoroShortBreakMinutes < 1 || next.pomodoroLongBreakMinutes < 1) {
      throw new Error('Las duraciones del Pomodoro deben ser mayores que cero.');
    }
    if (next.pomodoroCycles < 1) {
      throw new Error('El número de ciclos debe ser mayor que cero.');
    }
    this.db
      .prepare(
        `UPDATE settings SET theme = ?, pomodoro_focus_min = ?, pomodoro_short_break_min = ?, pomodoro_long_break_min = ?,
         pomodoro_cycles = ?, notifications_enabled = ?, widgets_json = ?, weather_city = ? WHERE id = 1`,
      )
      .run(
        next.theme,
        next.pomodoroFocusMinutes,
        next.pomodoroShortBreakMinutes,
        next.pomodoroLongBreakMinutes,
        next.pomodoroCycles,
        next.notificationsEnabled ? 1 : 0,
        JSON.stringify(next.widgets),
        next.weatherCity,
      );
    return this.get();
  }
}
