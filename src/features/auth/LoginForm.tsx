import { Alert, Anchor, Button, Checkbox, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { authApi } from '../../api/auth';
import { homePath, pendingStep, safeRedirect } from '../../auth/guards';
import { applyNewToken } from '../../auth/session';
import { CodeInput } from '../../components/CodeInput';
import { FormError } from '../../components/FormError';
import classes from './auth.module.css';

const schema = z.object({
  email: z.string().trim().min(1, 'required').pipe(z.email('email')),
  password: z.string().min(1, 'required'),
  rememberMe: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

/**
 * Ingreso con email y contraseña, con el paso de verificación en dos pasos. Vive en la tarjeta del
 * home; incluye su título porque cambia en el paso de 2FA.
 */
export function LoginForm({
  redirect,
  closed,
  autoFocus = false,
  titleOrder = 2,
  onForgot,
}: {
  redirect?: string;
  /** Se llega después de dar de baja la cuenta de la iglesia. */
  closed?: boolean;
  autoFocus?: boolean;
  titleOrder?: 1 | 2;
  /** "¿Olvidaste tu contraseña?": cambia la vista de la tarjeta. */
  onForgot: () => void;
}) {
  const { t } = useTranslation(['auth', 'errors']);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState('');
  // Sin el celular: se entra con uno de los códigos de recuperación (formato abcd-2345).
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  // Al volver del paso de 2FA, el formulario entra con la misma animación.
  const [challengeLeft, setChallengeLeft] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const finish = async (accessToken: string) => {
    const me = await applyNewToken(queryClient, accessToken);
    // Paso obligatorio (contraseña temporal, 2FA del superadmin): sigue en la misma tarjeta.
    const pending = pendingStep(me);
    if (pending) return navigate({ to: '/', search: { vista: pending, redirect }, resetScroll: false });
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
      <Stack gap="md" className={classes.enter}>
        <div>
          <Title order={titleOrder} size="h3">
            {t('twoFactor.title')}
          </Title>
          <Text c="dimmed" size="sm" mt={6}>
            {t('twoFactor.description')}
          </Text>
        </div>
        <FormError error={error} />
        {useRecovery ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim()) void onVerify(code.trim());
            }}
          >
            <Stack gap="md">
              <TextInput
                label={t('twoFactor.recoveryCode')}
                description={t('twoFactor.recoveryHelp')}
                value={code}
                onChange={(e) => setCode(e.currentTarget.value)}
                autoComplete="one-time-code"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
              />
              <Button type="submit" fullWidth loading={busy} disabled={!code.trim()}>
                {t('twoFactor.submit')}
              </Button>
            </Stack>
          </form>
        ) : (
          <>
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
          </>
        )}
        <Anchor
          component="button"
          type="button"
          size="sm"
          ta="center"
          onClick={() => {
            setUseRecovery((v) => !v);
            setCode('');
            setError(null);
          }}
        >
          {useRecovery ? t('twoFactor.useApp') : t('twoFactor.useRecovery')}
        </Anchor>
        <Anchor
          component="button"
          type="button"
          size="sm"
          ta="center"
          onClick={() => {
            setChallenge(null);
            setChallengeLeft(true);
            setUseRecovery(false);
            setCode('');
            setError(null);
          }}
        >
          {t('twoFactor.back')}
        </Anchor>
      </Stack>
    );
  }

  const fieldError = (name: keyof FormValues) => {
    const msg = form.formState.errors[name]?.message;
    return msg ? t(`errors:validation.${msg}` as never) : undefined;
  };

  return (
    <form onSubmit={onLogin} noValidate className={challengeLeft ? classes.enter : undefined}>
      <Stack gap="md">
        <Title order={titleOrder} size="h3">
          {t('login.title')}
        </Title>
        {closed && <Alert color="gray">{t('login.closed')}</Alert>}
        <FormError error={error} />
        <TextInput
          label={t('login.email')}
          type="email"
          autoComplete="username"
          inputMode="email"
          autoFocus={autoFocus}
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
        <Anchor component="button" type="button" size="sm" ta="center" onClick={onForgot}>
          {t('login.forgot')}
        </Anchor>
      </Stack>
    </form>
  );
}
