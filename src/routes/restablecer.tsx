import { Alert, Anchor, Button, Stack } from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconCircleCheck } from '@tabler/icons-react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { authApi } from '../api/auth';
import { FormError } from '../components/FormError';
import { NewPasswordFields } from '../components/NewPasswordFields';
import { newPasswordSchema } from '../components/new-password-schema';
import { AuthLayout } from '../layout/AuthLayout';

export const Route = createFileRoute('/restablecer')({
  validateSearch: z.object({ token: z.string().optional() }),
  component: ResetPage,
});

function ResetPage() {
  const { t } = useTranslation('auth');
  const { token } = Route.useSearch();
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

  if (!token || token.length < 20) {
    return (
      <AuthLayout title={t('reset.title')}>
        <Alert color="red" variant="light">
          {t('reset.invalidLink')}
        </Alert>
        <Anchor component={Link} to="/olvide-contrasena" size="sm" ta="center">
          {t('forgot.title')}
        </Anchor>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t('reset.title')}>
      {done ? (
        <>
          <Alert color="teal" variant="light" icon={<IconCircleCheck size={18} />} role="status">
            {t('reset.done')}
          </Alert>
          <Button component={Link} to="/login" fullWidth>
            {t('reset.goLogin')}
          </Button>
        </>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <Stack gap="md">
            <FormError error={error} />
            <NewPasswordFields register={form.register} errors={form.formState.errors} autoFocus />
            <Button type="submit" fullWidth loading={form.formState.isSubmitting}>
              {t('reset.submit')}
            </Button>
          </Stack>
        </form>
      )}
    </AuthLayout>
  );
}
