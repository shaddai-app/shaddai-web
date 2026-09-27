import { Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { errorMessage } from '../i18n/errors';

/** Error de un envío (API o red), traducido y anunciado a lectores de pantalla. */
export function FormError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <Alert color="red" variant="light" icon={<IconAlertCircle size={18} />} role="alert">
      {errorMessage(error)}
    </Alert>
  );
}
