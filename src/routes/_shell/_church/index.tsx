import { Stack, Text, Title } from '@mantine/core';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { DASHBOARD_PERIODS } from '../../../api/dashboard';
import { can, scopeOf } from '../../../auth/permissions';
import { meQuery } from '../../../auth/session';
import { MyTasksCard } from '../../../features/consolidation/MyTasksCard';
import { AnnouncementsCard } from '../../../features/announcements/AnnouncementsCard';
import { Dashboard } from '../../../features/dashboard/Dashboard';

export const Route = createFileRoute('/_shell/_church/')({
  validateSearch: z.object({ periodo: z.enum(DASHBOARD_PERIODS).optional() }),
  // Inicio según el rol: quien reporta solo su célula (líder) arranca en «Mi célula»; sin tablero,
  // quien solo usa un módulo arranca en él (tesorería en finanzas, etc.).
  beforeLoad: ({ context: { me } }) => {
    if (scopeOf(me, 'celulas.reportar') === 'own') throw redirect({ to: '/mi-celula', replace: true });
    if (!can(me, 'dashboard.ver')) {
      if (can(me, 'finanzas.ver')) throw redirect({ to: '/finanzas', replace: true });
      if (can(me, 'eventos.ver')) throw redirect({ to: '/calendario', replace: true });
    }
  },
  component: Home,
});

function Home() {
  const { t } = useTranslation();
  const { data: me } = useSuspenseQuery(meQuery());
  const { periodo = '30d' } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <Stack gap="lg" maw={1100}>
      <div>
        <Title order={1} size="h2">
          {t('home.greeting', { name: me.user.firstName })}
        </Title>
        <Text c="dimmed">{t('home.subtitle', { church: me.account?.name ?? '' })}</Text>
      </div>
      <AnnouncementsCard />
      {can(me, 'consolidacion.ver', 'consolidacion.gestionar') && <MyTasksCard />}
      {can(me, 'dashboard.ver') && (
        <Dashboard
          period={periodo}
          onPeriod={(p) => void navigate({ search: { periodo: p }, replace: true })}
        />
      )}
    </Stack>
  );
}
