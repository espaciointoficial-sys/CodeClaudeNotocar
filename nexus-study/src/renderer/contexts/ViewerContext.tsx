import { createContext, useContext, useState, type ReactNode } from 'react';

interface ViewerContextValue {
  openDocumentId: string | null;
  openViewer: (documentId: string) => void;
  closeViewer: () => void;
}

const ViewerContext = createContext<ViewerContextValue | null>(null);

export function ViewerProvider({ children }: { children: ReactNode }) {
  const [openDocumentId, setOpenDocumentId] = useState<string | null>(null);
  return (
    <ViewerContext.Provider
      value={{
        openDocumentId,
        openViewer: (id) => setOpenDocumentId(id),
        closeViewer: () => setOpenDocumentId(null),
      }}
    >
      {children}
    </ViewerContext.Provider>
  );
}

export function useViewer(): ViewerContextValue {
  const ctx = useContext(ViewerContext);
  if (!ctx) throw new Error('useViewer debe usarse dentro de ViewerProvider.');
  return ctx;
}
