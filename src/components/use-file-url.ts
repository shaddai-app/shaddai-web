import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { accountApi } from '../api/admin';

/**
 * URL local (blob:) de un archivo de la cuenta. Los archivos exigen el token de sesión, así que no
 * se pueden usar directo en <img src>: se descargan con fetch autenticado y se libera la URL al salir.
 */
export function useFileUrl(fileId: number | null | undefined): string | undefined {
  const { data: blob } = useQuery({
    queryKey: ['file', fileId],
    queryFn: () => accountApi.file(fileId!),
    enabled: typeof fileId === 'number',
    staleTime: Infinity,
  });
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : undefined), [blob]);
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);
  return url;
}
