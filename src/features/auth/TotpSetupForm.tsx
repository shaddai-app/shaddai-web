import { Anchor, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Me } from '../../api/types';
import { applyNewToken } from '../../auth/session';
import { RecoveryCodes } from '../security/RecoveryCodes';
import { TotpEnrollment } from '../security/TotpEnrollment';

/** Alta obligatoria de la verificación en dos pasos (superadmin), con los códigos de recuperación al final. */
export function TotpSetupForm({
  onDone,
  onLogout,
  titleOrder = 2,
}: {
  onDone: (me: Me) => void;
  onLogout: () => void;
  titleOrder?: 1 | 2;
}) {
  const { t } = useTranslation(['auth', 'settings', 'common']);
  const queryClient = useQueryClient();
  // Después de activarla se muestran los códigos de recuperación antes de entrar.
  const [done, setDone] = useState<{ me: Me; codes: string[] } | null>(null);

  if (done) {
    return (
      <Stack gap="md">
        <Title order={titleOrder} size="h3">
          {t('settings:twoFactor.codes.title')}
        </Title>
        <RecoveryCodes codes={done.codes} onDone={() => onDone(done.me)} />
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <div>
        <Title order={titleOrder} size="h3">
          {t('totp.title')}
        </Title>
        <Text c="dimmed" size="sm" mt={6}>
          {t('totp.description')}
        </Text>
      </div>
      <TotpEnrollment
        onConfirmed={async (res) => {
          const me = await applyNewToken(queryClient, res.accessToken);
          notifications.show({ color: 'teal', message: t('totp.done') });
          setDone({ me, codes: res.recoveryCodes });
        }}
      />
      <Anchor component="button" type="button" size="sm" ta="center" onClick={onLogout}>
        {t('common:userMenu.logout')}
      </Anchor>
    </Stack>
  );
}
