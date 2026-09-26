import { Center, Stack, Text, Title } from '@mantine/core';
import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '../layout/AppLayout';

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
  notFoundComponent: NotFound,
});

function NotFound() {
  const { t } = useTranslation();
  return (
    <Center mih="60vh">
      <Stack align="center" gap="xs">
        <Title order={1}>404</Title>
        <Text c="dimmed">{t('notFound')}</Text>
      </Stack>
    </Center>
  );
}
