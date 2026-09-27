import { Badge, Button, Card, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconDeviceDesktop, IconDeviceMobile, IconHeadset } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { authApi, meApi } from '../../../api/auth';
import type { ActiveSession } from '../../../api/types';
import { useSession } from '../../../auth/session-store';
import { FormError } from '../../../components/FormError';
import { errorMessage } from '../../../i18n/errors';
import { PageHeader } from '../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/configuracion/seguridad')({ component: SecurityPage });

/** Resumen legible del user-agent (sin librerías: alcanza para reconocer el dispositivo). */
function describeDevice(ua: string | null): { label: string | null; mobile: boolean } {
  if (!ua) return { label: null, mobile: false };
  const mobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Safari\//.test(ua)
          ? 'Safari'
          : null;
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad|Mac OS/.test(ua)
        ? 'Apple'
        : /Linux/.test(ua)
          ? 'Linux'
          : null;
  return { label: [browser, os].filter(Boolean).join(' · ') || null, mobile };
}

function SessionRow({
  s,
  onRevoke,
  revoking,
}: {
  s: ActiveSession;
  onRevoke: () => void;
  revoking: boolean;
}) {
  const { t } = useTranslation(['settings', 'auth', 'common']);
  const device = describeDevice(s.userAgent);
  const Icon = s.support ? IconHeadset : device.mobile ? IconDeviceMobile : IconDeviceDesktop;
  return (
    <Group justify="space-between" wrap="nowrap" py="xs">
      <Group wrap="nowrap" gap="sm" miw={0}>
        <Icon size={24} stroke={1.5} aria-hidden />
        <div style={{ minWidth: 0 }}>
          <Group gap={6}>
            <Text size="sm" fw={500} truncate>
              {s.support ? t('security.support') : (device.label ?? t('security.unknownDevice'))}
            </Text>
            {s.current && (
              <Badge size="xs" variant="light">
                {t('security.current')}
              </Badge>
            )}
          </Group>
          <Text size="xs" c="dimmed">
            {t('security.lastUsed', { date: s.lastUsedAt ? dayjs(s.lastUsedAt).format('L LT') : '—' })}
            {s.ip ? ` · ${s.ip}` : ''}
          </Text>
        </div>
      </Group>
      {!s.current && (
        <Button size="xs" variant="subtle" color="red" onClick={onRevoke} loading={revoking}>
          {t('security.revoke')}
        </Button>
      )}
    </Group>
  );
}

function SecurityPage() {
  const { t } = useTranslation(['settings', 'auth', 'common']);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const inSupport = useSession((s) => Boolean(s.support));
  const sessions = useQuery({ queryKey: ['me', 'sessions'], queryFn: meApi.sessions, enabled: !inSupport });

  const revoke = useMutation({
    mutationFn: meApi.revokeSession,
    onSuccess: () => {
      notifications.show({ color: 'teal', message: t('security.revoked') });
      void queryClient.invalidateQueries({ queryKey: ['me', 'sessions'] });
    },
    onError: (err) => notifications.show({ color: 'red', message: errorMessage(err) }),
  });

  const logoutAll = () =>
    modals.openConfirmModal({
      title: t('auth:logoutEverywhere'),
      children: <Text size="sm">{t('security.logoutAllConfirm')}</Text>,
      labels: { confirm: t('auth:logoutEverywhere'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        await authApi.logoutAll();
        useSession.getState().clear();
        queryClient.clear();
        void navigate({ to: '/login' });
      },
    });

  return (
    <>
      <PageHeader title={t('security.title')} />
      <Stack gap="lg" maw={720}>
        <Card withBorder radius="lg" padding="lg">
          <Group justify="space-between" align="flex-start" gap="sm">
            <div>
              <Title order={2} size="h4">
                {t('security.password')}
              </Title>
              <Text size="sm" c="dimmed">
                {t('security.passwordDescription')}
              </Text>
            </div>
            <Button component={Link} to="/cambiar-contrasena" variant="light" disabled={inSupport}>
              {t('security.changePassword')}
            </Button>
          </Group>
        </Card>

        {!inSupport && (
          <Card withBorder radius="lg" padding="lg">
            <Title order={2} size="h4">
              {t('security.sessions')}
            </Title>
            <Text size="sm" c="dimmed" mb="sm">
              {t('security.sessionsDescription')}
            </Text>
            <FormError error={sessions.error} />
            {sessions.isPending ? (
              <Loader size="sm" />
            ) : (
              <Stack gap={0}>
                {sessions.data?.items.map((s) => (
                  <SessionRow
                    key={s.id}
                    s={s}
                    onRevoke={() => revoke.mutate(s.id)}
                    revoking={revoke.isPending && revoke.variables === s.id}
                  />
                ))}
              </Stack>
            )}
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" color="red" onClick={logoutAll}>
                {t('auth:logoutEverywhere')}
              </Button>
            </Group>
          </Card>
        )}
      </Stack>
    </>
  );
}
