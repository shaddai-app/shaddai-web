import { Anchor, Button, PasswordInput, Stack } from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { notifications } from '@mantine/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { authApi } from '../api/auth';
import { homePath, pendingStepPath, requirePendingStep } from '../auth/guards';
import { applyNewToken, logout } from '../auth/session';
import { FormError } from '../components/FormError';
import { NewPasswordFields } from '../components/NewPasswordFields';
import { newPasswordSchema } from '../components/new-password-schema';
import { AuthLayout } from '../layout/AuthLayout';

// Obligatoria en el primer ingreso (o tras un reset del admin); también sirve para el cambio voluntario.
export const Route = createFileRoute('/cambiar-contrasena')({
  beforeLoad: (args) => requirePendingStep(args, '/cambiar-contrasena', { allowVoluntary: true }),
  component: ChangePasswordPage,
});

const schema = newPasswordSchema.and(z.object({ currentPassword: z.string().min(1, 'required') }));

function ChangePasswordPage() {
  const { t } = useTranslation(['auth', 'common', 'errors']);
  const { forced } = Route.useRouteContext();
  const navigate = useNavigate();
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
      await navigate({ to: pendingStepPath(me) ?? homePath(me) });
    } catch (err) {
      setError(err);
    }
  });

  const currentError = form.formState.errors.currentPassword?.message;

  return (
    <AuthLayout
      title={t('changePassword.title')}
      description={forced ? t('changePassword.forcedDescription') : t('changePassword.description')}
    >
      <form onSubmit={onSubmit} noValidate>
        <Stack gap="md">
          <FormError error={error} />
          <PasswordInput
            label={forced ? t('changePassword.currentTemporary') : t('changePassword.current')}
            autoComplete="current-password"
            autoFocus
            error={currentError ? t(`errors:validation.${currentError}` as never) : undefined}
            {...form.register('currentPassword')}
          />
          <NewPasswordFields register={form.register} errors={form.formState.errors} />
          <Button type="submit" fullWidth loading={form.formState.isSubmitting}>
            {t('changePassword.submit')}
          </Button>
        </Stack>
      </form>
      {forced ? (
        // En el paso obligatorio la única salida es cerrar sesión.
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
      ) : (
        <Anchor component={Link} to="/configuracion/seguridad" size="sm" ta="center">
          {t('common:actions.back')}
        </Anchor>
      )}
    </AuthLayout>
  );
}
