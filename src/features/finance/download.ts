import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { saveBlob } from '../../api/people';
import { errorMessage } from '../../i18n/errors';

/**
 * Descarga de un archivo generado por la API (reportes, constancias, recibos) en el idioma del
 * usuario, con estado de carga y el error traducido si falla.
 */
export function useDownload() {
  const { i18n } = useTranslation();
  const [busy, setBusy] = useState<string | null>(null);
  const lang = i18n.resolvedLanguage ?? 'es';
  const run = async (key: string, fetchBlob: (lang: string) => Promise<Blob>, fileName: string) => {
    setBusy(key);
    try {
      saveBlob(await fetchBlob(lang), fileName);
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  };
  return { busy, run };
}
