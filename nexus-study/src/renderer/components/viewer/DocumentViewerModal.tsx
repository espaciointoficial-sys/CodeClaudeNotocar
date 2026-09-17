import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { DocumentItem } from '@shared/types';
import { useViewer } from '../../contexts/ViewerContext';
import { PomodoroMiniWidget } from '../pomodoro/PomodoroMiniWidget';
import { PdfViewer, type PdfViewerHandle } from './PdfViewer';
import { ImageViewer } from './ImageViewer';
import { DocumentSidePanel } from './DocumentSidePanel';
import { Icon } from '../ui/Icon';
import styles from './DocumentViewerModal.module.css';

const MIN_STUDY_SECONDS_TO_LOG = 5;

export function DocumentViewerModal({ documentId }: { documentId: string }) {
  const { closeViewer } = useViewer();
  const [doc, setDoc] = useState<DocumentItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [panelOpen, setPanelOpen] = useState(true);
  const [studyMode, setStudyMode] = useState(false);
  const pdfViewerRef = useRef<PdfViewerHandle>(null);

  const accumulatedRef = useRef(0);
  const segmentStartRef = useRef<number | null>(null);

  useEffect(() => {
    window.api.documents.get(documentId).then((loaded) => {
      setDoc(loaded);
      if (loaded) setCurrentPage(loaded.lastPage);
    });
  }, [documentId]);

  const finalizeStudyTime = useCallback(() => {
    if (segmentStartRef.current) {
      accumulatedRef.current += (Date.now() - segmentStartRef.current) / 1000;
      segmentStartRef.current = null;
    }
    const total = Math.round(accumulatedRef.current);
    accumulatedRef.current = 0;
    if (total >= MIN_STUDY_SECONDS_TO_LOG && doc) {
      const endedAt = new Date().toISOString();
      const startedAt = new Date(Date.now() - total * 1000).toISOString();
      void window.api.studySessions.create({
        subjectId: doc.subjectId,
        documentId: doc.id,
        durationSeconds: total,
        startedAt,
        endedAt,
        type: 'free_reading',
      });
      void window.api.documents.registerStudy(doc.id);
    }
  }, [doc]);

  // Modo estudio: cuenta el tiempo solo mientras la ventana está en foco/visible.
  useEffect(() => {
    if (!studyMode) return;
    segmentStartRef.current = Date.now();

    const pause = () => {
      if (segmentStartRef.current) {
        accumulatedRef.current += (Date.now() - segmentStartRef.current) / 1000;
        segmentStartRef.current = null;
      }
    };
    const resume = () => {
      if (doc !== null && window.document.visibilityState === 'visible') segmentStartRef.current = Date.now();
    };
    const onVisibility = () => (window.document.visibilityState === 'visible' ? resume() : pause());

    window.addEventListener('blur', pause);
    window.addEventListener('focus', resume);
    window.document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', pause);
      window.removeEventListener('focus', resume);
      window.document.removeEventListener('visibilitychange', onVisibility);
      pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyMode]);

  const handleClose = () => {
    if (studyMode) finalizeStudyTime();
    closeViewer();
  };

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (studyMode) setStudyMode(false);
      else handleClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyMode]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (doc) void window.api.documents.setLastPage(doc.id, page);
  };

  if (!doc) return null;

  const fileUrl = `nexus-doc://${doc.id}`;
  const isPdf = doc.fileType === 'pdf';

  return createPortal(
    <div className={styles.overlay} data-study={studyMode}>
      {!studyMode && (
        <header className={styles.header}>
          <button className={styles.closeButton} onClick={handleClose} aria-label="Cerrar visor">
            <Icon name="chevron-left" size={15} />
            Volver
          </button>
          <h1 className={styles.title}>{doc.title}</h1>
          <div className={styles.headerActions}>
            <button onClick={() => setPanelOpen((v) => !v)} data-active={panelOpen}>
              Notas y marcadores
            </button>
            <button
              onClick={() => {
                setStudyMode(true);
                setPanelOpen(false);
              }}
            >
              Modo estudio
            </button>
          </div>
        </header>
      )}

      <div className={styles.body}>
        <div className={styles.viewerArea}>
          {isPdf ? (
            <PdfViewer
              ref={pdfViewerRef}
              url={fileUrl}
              initialPage={doc.lastPage}
              showPagePanel={panelOpen && !studyMode}
              onDocumentLoaded={() => {}}
              onPageChange={handlePageChange}
            />
          ) : (
            <ImageViewer url={fileUrl} />
          )}
        </div>
        {panelOpen && !studyMode && (
          <DocumentSidePanel
            document={doc}
            currentPage={currentPage}
            isPdf={isPdf}
            onJumpToPage={(page) => pdfViewerRef.current?.goToPage(page)}
          />
        )}
      </div>

      {studyMode && (
        <div className={styles.studyOverlay}>
          <button className={styles.exitStudy} onClick={() => setStudyMode(false)}>
            <Icon name="x" size={14} />
            Salir del modo estudio (Esc)
          </button>
          <div className={styles.studyPomodoro}>
            <PomodoroMiniWidget />
          </div>
        </div>
      )}
    </div>,
    window.document.body,
  );
}
