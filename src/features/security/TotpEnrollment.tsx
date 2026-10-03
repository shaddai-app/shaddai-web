import { Button, Center, Code, CopyButton, Group, Image, Loader, Stack, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../api/auth';
import { CodeInput } from '../../components/CodeInput';
import { FormError } from '../../components/FormError';

type Confirmed = Awaited<ReturnType<typeof authApi.confirmTotp>>;

/**
 * Alta de la verificación en dos pasos: QR (o clave para tipear) y el primer código de la app.
 * La usan el enrolamiento obligatorio del superadmin y la pantalla de Seguridad.
 */
export function TotpEnrollment({ onConfirmed }: { onConfirmed: (res: Confirmed) => void | Promise<void> }) {
  const { t } = useTranslation(['auth', 'common']);
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
      await onConfirmed(await authApi.confirmTotp(value));
    } catch (err) {
      setError(err);
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  if (enrollment.isPending) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }
  return (
    <Stack gap="md">
      <FormError error={error ?? enrollment.error} />
      {enrollment.data && (
        <>
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
        </>
      )}
    </Stack>
  );
}
