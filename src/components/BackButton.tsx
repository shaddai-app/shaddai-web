import { Button } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

/** Pantalla padre de un detalle (la lista o la entidad que lo contiene). */
export interface BackTarget {
  to: string;
  params?: Record<string, string>;
}

/**
 * "Volver" de las pantallas de detalle: un enlace fijo a la sección padre, no el historial del
 * navegador (desde una pestaña nueva o un enlace directo no habría a dónde volver).
 */
export function BackButton({ to, label }: { to: BackTarget; label?: string }) {
  const { t } = useTranslation();
  return (
    <Button
      component={Link}
      to={to.to as never}
      params={to.params as never}
      variant="subtle"
      color="gray"
      size="sm"
      px={8}
      ml={-8}
      w="fit-content"
      leftSection={<IconArrowLeft size={16} />}
    >
      {label ?? t('actions.back')}
    </Button>
  );
}
