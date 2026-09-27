import { Alert, Anchor, Button, Stack, TextInput } from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconMailCheck } from '@tabler/icons-react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { authApi } from '../api/auth';
import { redirectIfLoggedIn } from '../auth/guards';
import { FormError } from '../components/FormError';
import { AuthLayout } from '../layout/AuthLayout';

export const Route = createFileRoute('/olvide-contrasena')({
  beforeLoad: (args) => redirectIfLoggedIn(args),
  component: ForgotPage,
});

const schema = z.object({ email: z.string().trim().min(1, 'required').pipe(z.email('email')) });

function ForgotPage() {
  const { t } = useTranslation(['auth', 'errors']);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  const onSubmit = form.handleSubmit(async ({ email }) => {
    setError(null);
    try {
      await authApi.forgot(email);
      setSent(true);
    } catch (err) {
      setError(err);
    }
  });

  const emailError = form.formState.errors.email?.message;

  return (
    <AuthLayout title={t('forgot.title')} description={sent ? undefined : t('forgot.description')}>
      {sent ? (
        <Alert color="teal" variant="light" icon={<IconMailCheck size={18} />} role="status">
          {t('forgot.sent')}
        </Alert>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <Stack gap="md">
            <FormError error={error} />
            <TextInput
              label={t('login.email')}
              type="email"
              autoComplete="email"
              inputMode="email"
              autoFocus
              error={emailError ? t(`errors:validation.${emailError}` as never) : undefined}
              {...form.register('email')}
            />
            <Button type="submit" fullWidth loading={form.formState.isSubmitting}>
              {t('forgot.submit')}
            </Button>
          </Stack>
        </form>
      )}
      <Anchor component={Link} to="/login" size="sm" ta="center">
        {t('forgot.back')}
      </Anchor>
    </AuthLayout>
  );
}
