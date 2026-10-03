import { Button, Center, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  Outlet,
  useRouter,
  type ErrorComponentProps,
} from '@tanstack/react-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { sessionEvents } from '../api/http';
import { reportError } from '../app/sentry';
import { PwaUpdater } from '../pwa/PwaUpdater';

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Root,
  notFoundComponent: NotFound,
  pendingComponent: PageLoader,
});

/** Reacciona a la sesión que se pierde (refresh vencido) o a la sesión de soporte que termina. */
function SessionEvents() {
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    const onLoggedOut = () => {
      queryClient.clear();
      const { pathname, href } = router.state.location;
      // Desde pantallas públicas (login, recuperación) no tiene sentido volver a ellas después.
      const isPublic = ['/', '/login', '/olvide-contrasena', '/restablecer'].includes(pathname);
      void router.navigate({ to: '/login', search: isPublic ? {} : { redirect: href } });
    };
    const onSupportEnded = () => {
      // El token de soporte ya se descartó en el cliente HTTP; se limpian los datos de la iglesia.
      queryClient.clear();
      void router.navigate({ to: '/plataforma' });
    };
    sessionEvents.addEventListener('logged-out', onLoggedOut);
    sessionEvents.addEventListener('support-ended', onSupportEnded);
    return () => {
      sessionEvents.removeEventListener('logged-out', onLoggedOut);
      sessionEvents.removeEventListener('support-ended', onSupportEnded);
    };
  }, [router, queryClient]);
  return null;
}

function Root() {
  return (
    <>
      <SessionEvents />
      <PwaUpdater />
      <Outlet />
    </>
  );
}

export function PageLoader() {
  const { t } = useTranslation();
  return (
    <Center mih="60vh">
      <Loader aria-label={t('loading')} />
    </Center>
  );
}

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

/** Error no previsto al mostrar una pantalla: se reporta y se ofrece reintentar sin perder la sesión. */
export function RouteError({ error, reset }: ErrorComponentProps) {
  const { t } = useTranslation();
  const router = useRouter();
  useEffect(() => reportError(error), [error]);
  return (
    <Center mih="60vh" px="md">
      <Stack align="center" gap="sm" maw={420} ta="center">
        <Title order={2}>{t('crash.title')}</Title>
        <Text c="dimmed">{t('crash.body')}</Text>
        <Group justify="center">
          <Button
            onClick={() => {
              reset();
              void router.invalidate();
            }}
          >
            {t('crash.retry')}
          </Button>
          <Button variant="default" onClick={() => window.location.assign('/')}>
            {t('crash.home')}
          </Button>
        </Group>
      </Stack>
    </Center>
  );
}
