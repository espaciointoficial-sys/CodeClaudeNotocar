import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { pdfjsLib } from './pdfWorker';
import { Icon } from '../ui/Icon';
import styles from './PdfViewer.module.css';

export interface PdfViewerHandle {
  goToPage: (page: number) => void;
}

type FitMode = 'width' | 'page' | 'custom';

interface PdfViewerProps {
  url: string;
  initialPage: number;
  showPagePanel: boolean;
  onDocumentLoaded: (numPages: number) => void;
  onPageChange: (page: number) => void;
}

export const PdfViewer = forwardRef<PdfViewerHandle, PdfViewerProps>(function PdfViewer(
  { url, initialPage, showPagePanel, onDocumentLoaded, onPageChange },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<ReturnType<pdfjsLib.PDFPageProxy['render']> | null>(null);

  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [fitMode, setFitMode] = useState<FitMode>('width');
  const [customScale, setCustomScale] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState(String(initialPage));

  useEffect(() => {
    let cancelled = false;
    const loadingTask = pdfjsLib.getDocument({ url });
    loadingTask.promise
      .then((doc) => {
        if (cancelled) return;
        pdfRef.current = doc;
        setNumPages(doc.numPages);
        const startPage = Math.min(Math.max(1, initialPage), doc.numPages);
        setPage(startPage);
        setPageInput(String(startPage));
        onDocumentLoaded(doc.numPages);
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo abrir el PDF. El archivo podría estar dañado o no ser accesible.');
      });
    return () => {
      cancelled = true;
      void loadingTask.destroy();
      pdfRef.current = null;
    };
    // Solo debe recargarse cuando cambia el documento, no en cada cambio de initialPage/onDocumentLoaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useImperativeHandle(ref, () => ({
    goToPage: (target: number) => {
      if (!pdfRef.current) return;
      const clamped = Math.min(Math.max(1, target), pdfRef.current.numPages);
      setPage(clamped);
      setPageInput(String(clamped));
    },
  }));

  useEffect(() => {
    onPageChange(page);
    setPageInput(String(page));
  }, [page, onPageChange]);

  useEffect(() => {
    const doc = pdfRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas || page < 1) return;
    let cancelled = false;

    doc.getPage(page).then((pdfPage) => {
      if (cancelled) return;
      const baseViewport = pdfPage.getViewport({ scale: 1 });
      let scale = customScale;
      const container = containerRef.current;
      if (container) {
        if (fitMode === 'width') scale = (container.clientWidth - 32) / baseViewport.width;
        else if (fitMode === 'page') scale = Math.min((container.clientWidth - 32) / baseViewport.width, (container.clientHeight - 32) / baseViewport.height);
      }
      const viewport = pdfPage.getViewport({ scale });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext('2d');
      if (!context) return;
      renderTaskRef.current?.cancel();
      const task = pdfPage.render({ canvasContext: context, viewport, canvas });
      renderTaskRef.current = task;
      task.promise.catch(() => {
        /* la renderización se cancela al cambiar rápido de página; se ignora */
      });
    });

    return () => {
      cancelled = true;
    };
    // numPages cambia de 0 a un valor real justo cuando el documento termina de cargar;
    // sin esta dependencia, si initialPage ya era 1 (caso más común), setPage(1) no
    // provoca una nueva ejecución y la página nunca llega a renderizarse.
  }, [page, fitMode, customScale, numPages]);

  const goToPage = (target: number) => {
    if (!pdfRef.current) return;
    setPage(Math.min(Math.max(1, target), pdfRef.current.numPages));
  };

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <button onClick={() => goToPage(page - 1)} disabled={page <= 1} aria-label="Página anterior" data-tooltip="Página anterior">
          <Icon name="chevron-left" size={16} />
        </button>
        <form
          className={styles.pageForm}
          onSubmit={(e) => {
            e.preventDefault();
            goToPage(Number(pageInput) || 1);
          }}
        >
          <input
            className={styles.pageInput}
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            aria-label="Ir a la página"
          />
          <span>/ {numPages || '…'}</span>
        </form>
        <button onClick={() => goToPage(page + 1)} disabled={page >= numPages} aria-label="Página siguiente" data-tooltip="Página siguiente">
          <Icon name="chevron-right" size={16} />
        </button>
        <div className={styles.zoomGroup}>
          <button
            onClick={() => {
              setFitMode('custom');
              setCustomScale((s) => Math.max(0.4, s - 0.15));
            }}
            aria-label="Reducir zoom"
            data-tooltip="Reducir zoom"
          >
            <Icon name="zoom-out" size={16} />
          </button>
          <button
            onClick={() => {
              setFitMode('custom');
              setCustomScale((s) => Math.min(3, s + 0.15));
            }}
            aria-label="Aumentar zoom"
            data-tooltip="Aumentar zoom"
          >
            <Icon name="zoom-in" size={16} />
          </button>
          <button data-active={fitMode === 'width'} onClick={() => setFitMode('width')}>
            Ajustar al ancho
          </button>
          <button data-active={fitMode === 'page'} onClick={() => setFitMode('page')}>
            Ajustar a página
          </button>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.canvasArea} ref={containerRef}>
          <canvas ref={canvasRef} />
        </div>
        {showPagePanel && numPages > 0 && (
          <div className={styles.pagePanel}>
            {Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
              <button key={n} data-active={n === page} onClick={() => goToPage(n)}>
                {n}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
