import { SUBJECT_COLORS, SUBJECT_ICONS } from '../../lib/constants';
import styles from './ColorIconPicker.module.css';

export function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className={styles.swatchRow} role="radiogroup" aria-label="Color de la asignatura">
      {SUBJECT_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === color}
          aria-label={`Color ${color}`}
          className={styles.swatch}
          style={{ background: color, outlineColor: color }}
          data-selected={value === color}
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  );
}

export function IconPicker({ value, onChange }: { value: string | null; onChange: (icon: string | null) => void }) {
  return (
    <div className={styles.iconRow} role="radiogroup" aria-label="Icono de la asignatura">
      <button
        type="button"
        role="radio"
        aria-checked={value === null}
        className={styles.iconOption}
        data-selected={value === null}
        onClick={() => onChange(null)}
        title="Sin icono"
      >
        —
      </button>
      {SUBJECT_ICONS.map((icon) => (
        <button
          key={icon}
          type="button"
          role="radio"
          aria-checked={value === icon}
          className={styles.iconOption}
          data-selected={value === icon}
          onClick={() => onChange(icon)}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
