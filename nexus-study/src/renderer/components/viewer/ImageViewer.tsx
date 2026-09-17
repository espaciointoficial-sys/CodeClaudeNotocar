import { useRef, useState, type MouseEvent as ReactMouseEvent, type WheelEvent } from 'react';
import { Icon } from '../ui/Icon';
import styles from './ImageViewer.module.css';

export function ImageViewer({ url }: { url: string }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState(false);
  const dragging = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  const resetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((s) => Math.min(4, Math.max(0.3, s + delta)));
  };

  const onMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    dragging.current = { startX: e.clientX, startY: e.clientY, baseX: offset.x, baseY: offset.y };
  };

  const onMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragging.current.startX;
    const dy = e.clientY - dragging.current.startY;
    setOffset({ x: dragging.current.baseX + dx, y: dragging.current.baseY + dy });
  };

  const stopDragging = () => {
    dragging.current = null;
  };

  if (error) {
    return <div className={styles.error}>No se pudo abrir la imagen. El archivo podría estar dañado.</div>;
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <button onClick={() => setScale((s) => Math.max(0.3, s - 0.2))} aria-label="Reducir zoom" data-tooltip="Reducir zoom">
          <Icon name="zoom-out" size={16} />
        </button>
        <span>{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale((s) => Math.min(4, s + 0.2))} aria-label="Aumentar zoom" data-tooltip="Aumentar zoom">
          <Icon name="zoom-in" size={16} />
        </button>
        <button onClick={resetView}>Ajustar a pantalla</button>
      </div>
      <div
        className={styles.canvasArea}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
      >
        <img
          src={url}
          alt="Documento"
          draggable={false}
          className={styles.image}
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
          onError={() => setError(true)}
        />
      </div>
    </div>
  );
}
