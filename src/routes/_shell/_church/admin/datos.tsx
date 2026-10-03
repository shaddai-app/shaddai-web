import {
  Alert,
  Button,
  Card,
  Group,
  Modal,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
  SimpleGrid,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconDownload } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { accountApi } from '../../../../api/admin';
import { saveBlob } from '../../../../api/people';
import { requirePermission } from '../../../../auth/guards';
import { logout } from '../../../../auth/session';
import { FormError } from '../../../../components/FormError';
import { AnchorLink } from '../../../../components/links';
import { DemoBlocked } from '../../../../features/demo/DemoNotice';
import { SUPPORT_EMAIL } from '../../../../features/legal/constants';
import { PageHeader } from '../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/admin/datos')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'cuenta.configurar'),
  component: DataPage,
});

/** Días entre la baja y el borrado definitivo (los fija la API). */
const PURGE_DAYS = 90;

function Section({ title, children, danger }: { title: string; children: ReactNode; danger?: boolean }) {
  return (
    <Card
      withBorder
      radius="lg"
      padding="lg"
      style={danger ? { borderColor: 'var(--mantine-color-red-6)' } : undefined}
    >
      <Title order={2} size="h4" mb="sm" c={danger ? 'red' : undefined}>
        {title}
      </Title>
      <Stack gap="sm">{children}</Stack>
    </Card>
  );
}

function DataPage() {
  const { t } = useTranslation(['admin', 'legal']);
  const { me } = Route.useRouteContext();
  const account = me.account!;
  const [error, setError] = useState<unknown>(null);
  const [closing, closeModal] = useDisclosure(false);

  const download = useMutation({
    mutationFn: accountApi.exportData,
    onMutate: () => setError(null),
    onSuccess: (blob) => {
      saveBlob(blob, `shaddai-${account.slug}-${dayjs().format('YYYY-MM-DD')}.zip`);
      notifications.show({ message: t('data.export.done'), color: 'green' });
    },
    onError: setError,
  });

  return (
    <Stack gap="lg">
      <PageHeader title={t('data.title')} description={t('data.description')} />
      <FormError error={error} />

      <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="lg" style={{ alignItems: 'start' }}>
        <Section title={t('data.export.title')}>
          <Text>{t('data.export.body')}</Text>
          <Text size="sm" c="dimmed">
            {t('data.export.excluded')}
          </Text>
          {account.isDemo ? (
            <DemoBlocked what="export" />
          ) : (
            <Group>
              <Button
                leftSection={<IconDownload size={18} />}
                loading={download.isPending}
                onClick={() => download.mutate()}
              >
                {t('data.export.button')}
              </Button>
            </Group>
          )}
        </Section>

        <Section title={t('data.legal.title')}>
          <Text>{t('data.legal.body')}</Text>
          <Group gap="lg">
            <AnchorLink to="/privacidad">{t('legal:privacy.title')}</AnchorLink>
            <AnchorLink to="/terminos">{t('legal:terms.title')}</AnchorLink>
          </Group>
        </Section>

        <Section title={t('data.closure.title')} danger>
          <Text>{t('data.closure.body', { days: PURGE_DAYS, email: SUPPORT_EMAIL })}</Text>
          <Text size="sm" fw={500}>
            {t('data.closure.advice')}
          </Text>
          {account.isDemo ? (
            <DemoBlocked what="closure" />
          ) : me.user.isAccountOwner ? (
            <Group>
              <Button color="red" variant="outline" onClick={closeModal.open}>
                {t('data.closure.button')}
              </Button>
            </Group>
          ) : (
            <Text size="sm" c="dimmed">
              {t('data.closure.ownerOnly')}
            </Text>
          )}
        </Section>
      </SimpleGrid>

      <ClosureModal opened={closing} onClose={closeModal.close} churchName={account.name} />
    </Stack>
  );
}

function ClosureModal({
  opened,
  onClose,
  churchName,
}: {
  opened: boolean;
  onClose: () => void;
  churchName: string;
}) {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState('');
  const [password, setPassword] = useState('');
  const matches = confirm.trim().toLocaleLowerCase() === churchName.trim().toLocaleLowerCase();

  const close = useMutation({
    mutationFn: () => accountApi.close({ password, confirm: confirm.trim() }),
    onSuccess: async () => {
      // La API ya cortó todas las sesiones: se limpia lo local aunque el logout falle, y se recarga
      // la app entera en el login (una navegación interna compite con la que dispara la sesión perdida).
      await logout(queryClient).catch(() => undefined);
      window.location.assign('/login?closed=1');
    },
  });

  const reset = () => {
    setConfirm('');
    setPassword('');
    close.reset();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={reset}
      title={t('data.closure.modalTitle', { name: churchName })}
      centered
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (matches && password) close.mutate();
        }}
      >
        <Stack gap="md">
          <Alert color="red" icon={<IconAlertTriangle size={18} />}>
            {t('data.closure.warning', { days: PURGE_DAYS })}
          </Alert>
          <FormError error={close.error} />
          <TextInput
            label={t('data.closure.confirm', { name: churchName })}
            value={confirm}
            onChange={(e) => setConfirm(e.currentTarget.value)}
            autoComplete="off"
            data-autofocus
          />
          <PasswordInput
            label={t('data.closure.password')}
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            autoComplete="current-password"
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={reset}>
              {t('data.closure.cancel')}
            </Button>
            <Button type="submit" color="red" disabled={!matches || !password} loading={close.isPending}>
              {t('data.closure.submit')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
