import { useEffect, useState } from 'react';
import type { UpdateStatus } from '@shared/types';

/** Estado de actualización en vivo: carga el estado inicial y se mantiene al día vía IPC. */
export function useUpdateStatus(): UpdateStatus | null {
  const [status, setStatus] = useState<UpdateStatus | null>(null);

  useEffect(() => {
    window.api.updates.getStatus().then(setStatus);
    return window.api.updates.onStatusChange(setStatus);
  }, []);

  return status;
}
