import { Card, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconChartBar } from '@tabler/icons-react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { scopeOf } from '../../../auth/permissions';
import { meQuery } from '../../../auth/session';

export const Route = createFileRoute('/_shell/_church/')({
  // Inicio según el rol: quien reporta solo su célula (líder) arranca en «Mi célula».
  beforeLoad: ({ context }) => {
    if (scopeOf(context.me, 'celulas.reportar') === 'own')
      throw redirect({ to: '/mi-celula', replace: true });
  },
  component: Home,
});

function Home() {
  const { t } = useTranslation();
  const { data: me } = useSuspenseQuery(meQuery());
  return (
    <Stack gap="lg" maw={960}>
      <div>
        <Title order={1} size="h2">
          {t('home.greeting', { name: me.user.firstName })}
        </Title>
        <Text c="dimmed">{t('home.subtitle', { church: me.account?.name ?? '' })}</Text>
      </div>
      <Card withBorder radius="lg" padding="lg">
        <Group wrap="nowrap" align="flex-start">
          <ThemeIcon variant="light" size="xl" radius="md" aria-hidden>
            <IconChartBar size={24} />
          </ThemeIcon>
          <Text>{t('home.comingSoon')}</Text>
        </Group>
      </Card>
    </Stack>
  );
}
