import { Anchor, Button, Group, PasswordInput, Stack, Text, Title } from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { notifications } from '@mantine/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { authApi } from '../../api/auth';
import type { Me } from '../../api/types';
import { applyNewToken } from '../../auth/session';
import { FormError } from '../../components/FormError';
import { NewPasswordFields } from '../../components/NewPasswordFields';
import { newPasswordSchema } from '../../components/new-password-schema';

const schema = newPasswordSchema.and(z.object({ currentPassword: z.string().min(1, 'required') }));

/**
 * Cambio de contraseña. `forced`: paso obligatorio del primer ingreso (en la tarjeta del home, la
 * única salida es cerrar sesión). Si no, el cambio voluntario desde Seguridad (en un modal).
 */
export function ChangePasswordForm({
  forced,
  onDone,
  onLogout,
  onCancel,
  titleOrder = 2,
}: {
  forced: boolean;
  onDone: (me: Me) => void | Promise<void>;
  onLogout?: () => void;
  onCancel?: () => void;
  titleOrder?: 1 | 2;
}) {
  const { t } = useTranslation(['auth', 'common', 'errors']);
  const queryClient = useQueryClient();
  const [error, setError] = useState<unknown>(null);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
  });

  const onSubmit = form.handleSubmit(async ({ currentPassword, newPassword }) => {
    setError(null);
    try {
      const res = await authApi.changePassword({ currentPassword, newPassword });
      const me = await applyNewToken(queryClient, res.accessToken);
      notifications.show({ color: 'teal', message: t('changePassword.done') });
      await onDone(me);
    } catch (err) {
      setError(err);
    }
  });

  const currentError = form.formState.errors.currentPassword?.message;

  return (
    <Stack gap="md">
      {forced && (
        <div>
          <Title order={titleOrder} size="h3">
            {t('changePassword.title')}
          </Title>
          <Text c="dimmed" size="sm" mt={6}>
            {t('changePassword.forcedDescription')}
          </Text>
        </div>
      )}
      {!forced && (
        <Text c="dimmed" size="sm">
          {t('changePassword.description')}
        </Text>
      )}
      <form onSubmit={onSubmit} noValidate>
        <Stack gap="md">
          <FormError error={error} />
          <PasswordInput
            label={forced ? t('changePassword.currentTemporary') : t('changePassword.current')}
            autoComplete="current-password"
            data-autofocus
            error={currentError ? t(`errors:validation.${currentError}` as never) : undefined}
            {...form.register('currentPassword')}
          />
          <NewPasswordFields register={form.register} errors={form.formState.errors} />
          {forced ? (
            <Button type="submit" fullWidth loading={form.formState.isSubmitting}>
              {t('changePassword.submit')}
            </Button>
          ) : (
            <Group justify="flex-end" gap="sm">
              <Button variant="default" onClick={onCancel}>
                {t('common:actions.cancel')}
              </Button>
              <Button type="submit" loading={form.formState.isSubmitting}>
                {t('changePassword.submit')}
              </Button>
            </Group>
          )}
        </Stack>
      </form>
      {forced && onLogout && (
        <Anchor component="button" type="button" size="sm" ta="center" onClick={onLogout}>
          {t('common:userMenu.logout')}
        </Anchor>
      )}
    </Stack>
  );
}
