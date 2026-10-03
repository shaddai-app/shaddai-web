import { Alert, Button, Group, Stack, Text, Textarea } from '@mantine/core';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { IconHeadset } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { platformApi } from '../../api/platform';
import { FormError } from '../../components/FormError';
import { ResponsiveModal } from '../../components/ResponsiveModal';
import { enterSupport } from './support';

function ImpersonateForm({ userId, onClose }: { userId: number; onClose: () => void }) {
  const { t } = useTranslation(['platform', 'common', 'errors']);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const tooShort = reason.trim().length < 5;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const imp = await platformApi.impersonate(userId, reason.trim());
      enterSupport(queryClient, imp);
      onClose();
      await navigate({ to: '/inicio' });
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <Stack gap="md">
      <Alert color="orange" variant="light" icon={<IconHeadset size={18} />}>
        <Text size="sm">{t('impersonate.body')}</Text>
      </Alert>
      <FormError error={error} />
      <Textarea
        label={t('impersonate.reason')}
        placeholder={t('impersonate.reasonPlaceholder')}
        autosize
        minRows={2}
        data-autofocus
        value={reason}
        onChange={(e) => setReason(e.currentTarget.value)}
      />
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          {t('common:actions.cancel')}
        </Button>
        <Button color="orange" onClick={() => void submit()} loading={busy} disabled={tooShort}>
          {t('impersonate.submit')}
        </Button>
      </Group>
    </Stack>
  );
}

/** "Entrar como": pide el motivo (queda en la auditoría de la plataforma y de la iglesia). */
export function ImpersonateModal({
  target,
  onClose,
}: {
  target: { id: number; name: string } | null;
  onClose: () => void;
}) {
  const { t } = useTranslation('platform');
  return (
    <ResponsiveModal
      opened={Boolean(target)}
      onClose={onClose}
      size="md"
      title={target ? t('impersonate.title', { name: target.name }) : ''}
    >
      {target && <ImpersonateForm key={target.id} userId={target.id} onClose={onClose} />}
    </ResponsiveModal>
  );
}
