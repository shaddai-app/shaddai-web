import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { platformApi, type PlatformAccount } from '../../api/platform';
import { FormError } from '../../components/FormError';
import { ResponsiveModal } from '../../components/ResponsiveModal';

/**
 * Restablecer la iglesia demo. Pide las credenciales de la demo (mail del admin demo y su contraseña de
 * configuración): el servidor verifica que el id de esta pantalla y esas credenciales sean de la demo
 * antes de borrar nada.
 */
function ResetForm({ account, onClose }: { account: PlatformAccount; onClose: () => void }) {
  const { t } = useTranslation(['platform', 'common']);
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await platformApi.resetDemo({ accountId: account.id, email: email.trim(), password });
      await queryClient.invalidateQueries({ queryKey: ['platform'] });
      notifications.show({
        color: 'teal',
        message: t('demo.done', { seconds: Math.max(1, Math.round(res.durationMs / 1000)) }),
      });
      onClose();
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      noValidate
    >
      <Stack gap="md">
        <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />}>
          {t('demo.warning')}
        </Alert>
        <FormError error={error} />
        <TextInput
          label={t('demo.email')}
          type="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
        />
        <PasswordInput
          label={t('demo.password')}
          description={t('demo.passwordHint')}
          autoComplete="off"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} disabled={busy}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" color="red" loading={busy} disabled={!email.trim() || !password}>
            {t('demo.confirm')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function DemoResetCard({ account }: { account: PlatformAccount }) {
  const { t } = useTranslation('platform');
  const [open, setOpen] = useState(false);

  return (
    <Card withBorder radius="lg" padding="lg">
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Title order={2} size="h4">
            {t('demo.title')}
          </Title>
          <Badge color="marfil" variant="light">
            {t('demo.badge')}
          </Badge>
        </Group>
        <Text size="sm" c="dimmed">
          {t('demo.hint')}
        </Text>
        <Text size="sm">
          {t('demo.lastReset', {
            date: account.lastDemoResetAt ? dayjs(account.lastDemoResetAt).format('L LT') : t('demo.never'),
          })}
        </Text>
        <Button
          color="red"
          variant="light"
          leftSection={<IconRefresh size={16} />}
          onClick={() => setOpen(true)}
        >
          {t('demo.reset')}
        </Button>
      </Stack>
      <ResponsiveModal opened={open} onClose={() => setOpen(false)} size="md" title={t('demo.modalTitle')}>
        {open && <ResetForm account={account} onClose={() => setOpen(false)} />}
      </ResponsiveModal>
    </Card>
  );
}
