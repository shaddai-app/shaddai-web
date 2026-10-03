import { Anchor } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Me } from '../api/types';
import { homePath, requirePendingStep } from '../auth/guards';
import { applyNewToken, logout } from '../auth/session';
import { RecoveryCodes } from '../features/security/RecoveryCodes';
import { TotpEnrollment } from '../features/security/TotpEnrollment';
import { AuthLayout } from '../layout/AuthLayout';

// Obligatorio para el superadmin antes de usar la plataforma.
export const Route = createFileRoute('/configurar-2fa')({
  beforeLoad: (args) => requirePendingStep(args, '/configurar-2fa'),
  component: TotpSetupPage,
});

function TotpSetupPage() {
  const { t } = useTranslation(['auth', 'settings', 'common']);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Después de activarla se muestran los códigos de recuperación antes de entrar.
  const [done, setDone] = useState<{ me: Me; codes: string[] } | null>(null);

  if (done) {
    return (
      <AuthLayout title={t('settings:twoFactor.codes.title')}>
        <RecoveryCodes codes={done.codes} onDone={() => void navigate({ to: homePath(done.me) })} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t('totp.title')} description={t('totp.description')}>
      <TotpEnrollment
        onConfirmed={async (res) => {
          const me = await applyNewToken(queryClient, res.accessToken);
          notifications.show({ color: 'teal', message: t('totp.done') });
          setDone({ me, codes: res.recoveryCodes });
        }}
      />
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
