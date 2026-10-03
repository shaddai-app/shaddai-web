import { Alert, Anchor, Button, Stack, Text, TextInput, Title } from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconMailCheck } from '@tabler/icons-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { authApi } from '../../api/auth';
import { FormError } from '../../components/FormError';

const schema = z.object({ email: z.string().trim().min(1, 'required').pipe(z.email('email')) });

/** "Olvidé mi contraseña": pide el enlace por mail (la respuesta no revela si el email existe). */
export function ForgotForm({ onBack, titleOrder = 2 }: { onBack: () => void; titleOrder?: 1 | 2 }) {
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
    <Stack gap="md">
      <div>
        <Title order={titleOrder} size="h3">
          {t('forgot.title')}
        </Title>
        {!sent && (
          <Text c="dimmed" size="sm" mt={6}>
            {t('forgot.description')}
          </Text>
        )}
      </div>
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
              error={emailError ? t(`errors:validation.${emailError}` as never) : undefined}
              {...form.register('email')}
            />
            <Button type="submit" fullWidth loading={form.formState.isSubmitting}>
              {t('forgot.submit')}
            </Button>
          </Stack>
        </form>
      )}
      <Anchor component="button" type="button" size="sm" ta="center" onClick={onBack}>
        {t('forgot.back')}
      </Anchor>
    </Stack>
  );
}
