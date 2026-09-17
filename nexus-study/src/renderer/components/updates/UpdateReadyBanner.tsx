import { useState } from 'react';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { useUpdateStatus } from '../../hooks/useUpdateStatus';
import styles from './UpdateReadyBanner.module.css';

/**
 * Aviso discreto, fijo en la esquina, que solo aparece cuando hay una actualización
 * ya descargada y lista para instalar. No se muestra en ningún otro estado, para no
 * molestar mientras se comprueba o descarga en segundo plano.
 */
export function UpdateReadyBanner() {
  const status = useUpdateStatus();
  const [dismissed, setDismissed] = useState(false);

  if (!status || status.state !== 'downloaded' || dismissed) return null;

  return (
    <div className={styles.banner} role="status">
      <div className={styles.top}>
        <Icon name="download" size={18} className={styles.icon} />
        <div className={styles.body}>
          <p className={styles.title}>Hay una actualización lista para instalar</p>
          <p className={styles.subtitle}>
            {status.availableVersion ? `Nexus Study v${status.availableVersion}. ` : ''}
            Tus datos no se modificarán.
          </p>
        </div>
      </div>
      <div className={styles.actions}>
        <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
          Más tarde
        </Button>
        <Button size="sm" variant="primary" onClick={() => void window.api.updates.install()}>
          Reiniciar e instalar
        </Button>
      </div>
    </div>
  );
}
