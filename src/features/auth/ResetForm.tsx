import { Alert, Anchor, Button, Stack, Title } from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconCircleCheck } from '@tabler/icons-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../api/auth';
import { FormError } from '../../components/FormError';
import { NewPasswordFields } from '../../components/NewPasswordFields';
import { newPasswordSchema } from '../../components/new-password-schema';

/** Contraseña nueva desde el enlace del mail (`/?vista=restablecer&token=…`). */
export function ResetForm({
  token,
  onLogin,
  onForgot,
  titleOrder = 2,
}: {
  token?: string;
  onLogin: () => void;
  onForgot: () => void;
  titleOrder?: 1 | 2;
}) {
  const { t } = useTranslation('auth');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const form = useForm({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { newPassword: '', confirm: '' },
  });

  const onSubmit = form.handleSubmit(async ({ newPassword }) => {
    setError(null);
    try {
      await authApi.reset({ token: token!, newPassword });
      setDone(true);
    } catch (err) {
      setError(err);
    }
  });

  const title = (
    <Title order={titleOrder} size="h3">
      {t('reset.title')}
    </Title>
  );

  if (!token || token.length < 20) {
    return (
      <Stack gap="md">
        {title}
        <Alert color="red" variant="light">
          {t('reset.invalidLink')}
        </Alert>
        <Anchor component="button" type="button" size="sm" ta="center" onClick={onForgot}>
          {t('forgot.title')}
        </Anchor>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      {title}
      {done ? (
        <>
          <Alert color="teal" variant="light" icon={<IconCircleCheck size={18} />} role="status">
            {t('reset.done')}
          </Alert>
          <Button fullWidth onClick={onLogin}>
            {t('reset.goLogin')}
          </Button>
        </>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <Stack gap="md">
            <FormError error={error} />
            <NewPasswordFields register={form.register} errors={form.formState.errors} />
            <Button type="submit" fullWidth loading={form.formState.isSubmitting}>
              {t('reset.submit')}
            </Button>
          </Stack>
        </form>
      )}
    </Stack>
  );
}
