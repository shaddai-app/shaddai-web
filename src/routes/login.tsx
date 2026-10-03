import { Alert, Anchor, Button, Checkbox, PasswordInput, Stack, TextInput } from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { authApi } from '../api/auth';
import { homePath, pendingStepPath, redirectIfLoggedIn, safeRedirect } from '../auth/guards';
import { applyNewToken } from '../auth/session';
import { CodeInput } from '../components/CodeInput';
import { FormError } from '../components/FormError';
import { AuthLayout } from '../layout/AuthLayout';

export const Route = createFileRoute('/login')({
  // closed: se llega acá después de dar de baja la cuenta de la iglesia.
  validateSearch: z.object({ redirect: z.string().optional(), closed: z.literal(1).optional() }),
  beforeLoad: (args) => redirectIfLoggedIn(args, args.search.redirect),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().min(1, 'required').pipe(z.email('email')),
  password: z.string().min(1, 'required'),
  rememberMe: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

function LoginPage() {
  const { t } = useTranslation(['auth', 'errors']);
  const { redirect, closed } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const finish = async (accessToken: string) => {
    const me = await applyNewToken(queryClient, accessToken);
    const pending = pendingStepPath(me);
    if (pending) return navigate({ to: pending });
    const target = safeRedirect(redirect);
    return target ? navigate({ href: target }) : navigate({ to: homePath(me) });
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const onLogin = form.handleSubmit((values) =>
    run(async () => {
      const res = await authApi.login(values);
      if (res.requires2fa) {
        setChallenge(res.challengeToken);
        return;
      }
      await finish(res.accessToken);
    }),
  );

  const onVerify = (value: string) =>
    run(async () => {
      try {
        const res = await authApi.verify2fa({ challengeToken: challenge!, code: value });
        await finish(res.accessToken);
      } catch (err) {
        setCode('');
        throw err;
      }
    });

  if (challenge) {
    return (
      <AuthLayout title={t('twoFactor.title')} description={t('twoFactor.description')}>
        <FormError error={error} />
        <CodeInput
          label={t('twoFactor.code')}
          value={code}
          onChange={setCode}
          onComplete={onVerify}
          disabled={busy}
        />
        <Button fullWidth loading={busy} disabled={code.length !== 6} onClick={() => void onVerify(code)}>
          {t('twoFactor.submit')}
        </Button>
        <Anchor
          component="button"
          type="button"
          size="sm"
          ta="center"
          onClick={() => {
            setChallenge(null);
            setCode('');
            setError(null);
          }}
        >
          {t('twoFactor.back')}
        </Anchor>
      </AuthLayout>
    );
  }

  const fieldError = (name: keyof FormValues) => {
    const msg = form.formState.errors[name]?.message;
    return msg ? t(`errors:validation.${msg}` as never) : undefined;
  };

  return (
    <AuthLayout title={t('login.title')}>
      <form onSubmit={onLogin} noValidate>
        <Stack gap="md">
          {closed && <Alert color="gray">{t('login.closed')}</Alert>}
          <FormError error={error} />
          <TextInput
            label={t('login.email')}
            type="email"
            autoComplete="username"
            inputMode="email"
            autoFocus
            error={fieldError('email')}
            {...form.register('email')}
          />
          <PasswordInput
            label={t('login.password')}
            autoComplete="current-password"
            error={fieldError('password')}
            {...form.register('password')}
          />
          <Checkbox label={t('login.rememberMe')} {...form.register('rememberMe')} />
          <Button type="submit" fullWidth loading={busy}>
            {t('login.submit')}
          </Button>
          <Anchor component={Link} to="/olvide-contrasena" size="sm" ta="center">
            {t('login.forgot')}
          </Anchor>
        </Stack>
      </form>
    </AuthLayout>
  );
}
