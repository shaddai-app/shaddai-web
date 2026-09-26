import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../../../layout/PageHeader';

// Punto de entrada del superadmin. El listado de iglesias llega en el tramo de plataforma del front.
export const Route = createFileRoute('/_shell/_platform/plataforma/')({ component: PlatformHome });

function PlatformHome() {
  const { t } = useTranslation();
  return <PageHeader title={t('nav.accounts')} />;
}
