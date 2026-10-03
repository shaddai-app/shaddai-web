import {
  Badge,
  Button,
  Card,
  Group,
  Modal,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../api/auth';
import type { Me } from '../../api/types';
import { applyNewToken } from '../../auth/session';
import { FormError } from '../../components/FormError';
import { RecoveryCodes } from './RecoveryCodes';
import { TotpEnrollment } from './TotpEnrollment';

type Dialog = 'enroll' | 'codes' | 'regenerate' | 'disable' | null;

/** Verificación en dos pasos en Seguridad: activar, regenerar códigos y desactivar. */
export function TwoFactorCard({ me, disabled }: { me: Me; disabled: boolean }) {
  const { t } = useTranslation('settings');
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const { totpEnabled, totpRecoveryCodesLeft, isPlatformAdmin } = me.user;
  const refreshMe = () => queryClient.invalidateQueries({ queryKey: ['me'] });

  const showCodes = (fresh: string[]) => {
    setCodes(fresh);
    setDialog('codes');
  };

  return (
    <Card withBorder radius="lg" padding="lg">
      <Group justify="space-between" align="flex-start" gap="sm">
        <div style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs">
            <Title order={2} size="h4">
              {t('twoFactor.title')}
            </Title>
            <Badge variant="light" color={totpEnabled ? 'teal' : 'gray'}>
              {totpEnabled ? t('twoFactor.on') : t('twoFactor.off')}
            </Badge>
          </Group>
          <Text size="sm" c="dimmed" mt={4}>
            {totpEnabled ? t('twoFactor.descriptionOn') : t('twoFactor.descriptionOff')}
          </Text>
          {totpEnabled && (
            <Text size="sm" mt={6} c={totpRecoveryCodesLeft <= 2 ? 'orange' : undefined}>
              {t('twoFactor.codesLeft', { count: totpRecoveryCodesLeft })}
            </Text>
          )}
          {isPlatformAdmin && totpEnabled && (
            <Text size="xs" c="dimmed" mt={4}>
              {t('twoFactor.requiredForPlatform')}
            </Text>
          )}
        </div>
      </Group>
      <Group justify="flex-end" mt="md" gap="xs">
        {!totpEnabled ? (
          <Button onClick={() => setDialog('enroll')} disabled={disabled}>
            {t('twoFactor.enable')}
          </Button>
        ) : (
          <>
            <Button variant="light" onClick={() => setDialog('regenerate')} disabled={disabled}>
              {t('twoFactor.regenerate')}
            </Button>
            {!isPlatformAdmin && (
              <Button variant="subtle" color="red" onClick={() => setDialog('disable')} disabled={disabled}>
                {t('twoFactor.disable')}
              </Button>
            )}
          </>
        )}
      </Group>

      <Modal
        opened={dialog === 'enroll'}
        onClose={() => setDialog(null)}
        title={t('twoFactor.enableTitle')}
        centered
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            {t('twoFactor.enableHelp')}
          </Text>
          <TotpEnrollment
            onConfirmed={async (res) => {
              await applyNewToken(queryClient, res.accessToken);
              notifications.show({ color: 'teal', message: t('twoFactor.enabled') });
              showCodes(res.recoveryCodes);
            }}
          />
        </Stack>
      </Modal>

      {/* Sin cerrar con un clic afuera: los códigos no se vuelven a mostrar. */}
      <Modal
        opened={dialog === 'codes'}
        onClose={() => undefined}
        withCloseButton={false}
        closeOnClickOutside={false}
        closeOnEscape={false}
        title={t('twoFactor.codes.title')}
        centered
      >
        <RecoveryCodes
          codes={codes}
          onDone={() => {
            // Los códigos se quedan hasta que termina de cerrarse el modal (se pisan al generar otros).
            setDialog(null);
            void refreshMe();
          }}
        />
      </Modal>

      <PasswordDialog
        opened={dialog === 'regenerate'}
        onClose={() => setDialog(null)}
        title={t('twoFactor.regenerateTitle')}
        help={t('twoFactor.regenerateHelp')}
        submit={t('twoFactor.regenerate')}
        onSubmit={async ({ password }) =>
          showCodes((await authApi.regenerateRecoveryCodes(password)).recoveryCodes)
        }
      />

      <PasswordDialog
        opened={dialog === 'disable'}
        onClose={() => setDialog(null)}
        title={t('twoFactor.disableTitle')}
        help={t('twoFactor.disableHelp')}
        submit={t('twoFactor.disable')}
        danger
        withCode
        onSubmit={async (values) => {
          await authApi.disableTotp({ password: values.password, code: values.code });
          notifications.show({ color: 'teal', message: t('twoFactor.disabled') });
          setDialog(null);
          await refreshMe();
        }}
      />
    </Card>
  );
}

/** Pide la contraseña (y opcionalmente un código) antes de un cambio de seguridad. */
function PasswordDialog({
  opened,
  onClose,
  title,
  help,
  submit,
  danger,
  withCode,
  onSubmit,
}: {
  opened: boolean;
  onClose: () => void;
  title: string;
  help: string;
  submit: string;
  danger?: boolean;
  withCode?: boolean;
  onSubmit: (values: { password: string; code: string }) => Promise<void>;
}) {
  const { t } = useTranslation('settings');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setPassword('');
    setCode('');
    setError(null);
    onClose();
  };

  return (
    <Modal opened={opened} onClose={close} title={title} centered>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await onSubmit({ password, code });
            setPassword('');
            setCode('');
          } catch (err) {
            setError(err);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Stack gap="md">
          <Text size="sm">{help}</Text>
          <FormError error={error} />
          <PasswordInput
            label={t('twoFactor.password')}
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            autoComplete="current-password"
            data-autofocus
          />
          {withCode && (
            <TextInput
              label={t('twoFactor.code')}
              description={t('twoFactor.codeHelp')}
              value={code}
              onChange={(e) => setCode(e.currentTarget.value)}
              autoComplete="one-time-code"
            />
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              {t('twoFactor.cancel')}
            </Button>
            <Button
              type="submit"
              color={danger ? 'red' : undefined}
              loading={busy}
              disabled={!password || (withCode && !code.trim())}
            >
              {submit}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
