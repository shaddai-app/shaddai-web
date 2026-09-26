import { Anchor, Button, Center, Code, CopyButton, Group, Image, Loader, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import QRCode from 'qrcode';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authApi } from '../api/auth';
import { homePath, requirePendingStep } from '../auth/guards';
import { applyNewToken, logout } from '../auth/session';
import { CodeInput } from '../components/CodeInput';
import { FormError } from '../components/FormError';
import { AuthLayout } from '../layout/AuthLayout';

// Obligatorio para el superadmin antes de usar la plataforma.
export const Route = createFileRoute('/configurar-2fa')({
  beforeLoad: (args) => requirePendingStep(args, '/configurar-2fa'),
  component: TotpSetupPage,
});

function TotpSetupPage() {
  const { t } = useTranslation(['auth', 'common', 'errors']);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  // Un solo enrolamiento por visita: cada llamada genera un secreto nuevo.
  const enrollment = useQuery({
    queryKey: ['totp-enroll'],
    queryFn: async () => {
      const data = await authApi.enrollTotp();
      return { ...data, qr: await QRCode.toDataURL(data.otpauthUri, { margin: 1, width: 220 }) };
    },
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });

  const confirm = async (value: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.confirmTotp(value);
      const me = await applyNewToken(queryClient, res.accessToken);
      notifications.show({ color: 'teal', message: t('totp.done') });
      await navigate({ to: homePath(me) });
    } catch (err) {
      setError(err);
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title={t('totp.title')} description={t('totp.description')}>
      <FormError error={error ?? enrollment.error} />
      {enrollment.isPending ? (
        <Center py="xl">
          <Loader />
        </Center>
      ) : enrollment.data ? (
        <Stack gap="md">
          <Center>
            <Image src={enrollment.data.qr} alt="QR" w={220} h={220} radius="md" bg="white" p={6} />
          </Center>
          <Stack gap={4}>
            <Text size="sm" c="dimmed">
              {t('totp.manual')}
            </Text>
            <Group gap="xs" wrap="nowrap">
              <Code style={{ wordBreak: 'break-all', flex: 1 }}>{enrollment.data.secret}</Code>
              <CopyButton value={enrollment.data.secret}>
                {({ copied, copy }) => (
                  <Button size="xs" variant="light" onClick={copy}>
                    {copied ? t('common:actions.copied') : t('common:actions.copy')}
                  </Button>
                )}
              </CopyButton>
            </Group>
          </Stack>
          <CodeInput
            label={t('totp.code')}
            value={code}
            onChange={setCode}
            onComplete={confirm}
            disabled={busy}
          />
          <Button fullWidth loading={busy} disabled={code.length !== 6} onClick={() => void confirm(code)}>
            {t('totp.submit')}
          </Button>
        </Stack>
      ) : null}
      <Anchor
        component="button"
        type="button"
        size="sm"
        ta="center"
        onClick={async () => {
          await logout(queryClient);
          void navigate({ to: '/login' });
        }}
      >
        {t('common:userMenu.logout')}
      </Anchor>
    </AuthLayout>
  );
}
