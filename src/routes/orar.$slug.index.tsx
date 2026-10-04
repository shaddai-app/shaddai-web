import {
  Alert,
  Button,
  Center,
  Checkbox,
  CopyButton,
  Group,
  Loader,
  Radio,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconCircleCheck, IconCopy, IconExternalLink, IconShare } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { publicPrayerApi, WALL_SHARES } from '../api/prayer';
import { FormError } from '../components/FormError';
import { ButtonLink } from '../components/links';
import { PublicShell } from '../components/PublicShell';
import { Turnstile } from '../components/Turnstile';

// Página pública (sin sesión): pedir oración desde el QR, sin usuario. Al enviar, la persona recibe
// su enlace privado para ver las respuestas.
export const Route = createFileRoute('/orar/$slug/')({
  component: PrayerFormPage,
});

const schema = z
  .object({
    body: z.string().trim().min(1, 'required').max(1000),
    name: z.string().trim().max(150),
    phone: z.string().trim().max(30),
    email: z.union([z.literal(''), z.string().trim().pipe(z.email('email'))]),
    wantsContact: z.boolean(),
    wallShare: z.enum(WALL_SHARES),
    consent: z.boolean().refine((v) => v, 'required'),
    website: z.string(), // trampa para bots (campo oculto)
  })
  .refine((v) => !v.wantsContact || v.phone !== '' || v.email !== '', {
    path: ['phone'],
    message: 'contact',
  });
type Values = z.infer<typeof schema>;

const empty: Values = {
  body: '',
  name: '',
  phone: '',
  email: '',
  wantsContact: false,
  wallShare: 'no',
  consent: false,
  website: '',
};

function PrayerFormPage() {
  const { slug } = Route.useParams();
  const { t, i18n } = useTranslation(['prayer', 'errors', 'common']);
  const config = useQuery({
    queryKey: ['public-prayer-form', slug],
    queryFn: () => publicPrayerApi.form(slug),
    retry: false,
  });
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [sent, setSent] = useState<{ token: string; email: boolean } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: empty });

  if (config.isPending) {
    return (
      <Center mih="100dvh">
        <Loader />
      </Center>
    );
  }
  if (config.error) {
    return (
      <PublicShell>
        <Text ta="center">{t('publicForm.notFound')}</Text>
      </PublicShell>
    );
  }
  const { church, turnstileSiteKey } = config.data;

  if (sent) {
    const url = `${window.location.origin}/orar/${slug}/${sent.token}`;
    const canShare = typeof navigator.share === 'function';
    return (
      <PublicShell logo={church.logoUrl} name={church.name}>
        <Stack gap="md">
          <Stack align="center" ta="center" gap="sm">
            <IconCircleCheck size={48} color="var(--mantine-color-teal-6)" />
            <Title order={1} size="h3">
              {t('publicForm.thanksTitle')}
            </Title>
            <Text c="dimmed">{t('publicForm.thanksBody', { church: church.name })}</Text>
          </Stack>
          <Alert color="yellow" variant="light" title={t('publicForm.keepTitle')}>
            {sent.email ? t('publicForm.keepBodyEmail') : t('publicForm.keepBody')}
          </Alert>
          <TextInput
            value={url}
            readOnly
            aria-label={t('publicForm.linkLabel')}
            onFocus={(e) => e.currentTarget.select()}
          />
          <Group gap="xs" grow>
            <CopyButton value={url}>
              {({ copied, copy }) => (
                <Button
                  variant="light"
                  leftSection={<IconCopy size={16} />}
                  onClick={copy}
                  color={copied ? 'teal' : undefined}
                >
                  {copied ? t('publicForm.copied') : t('publicForm.copy')}
                </Button>
              )}
            </CopyButton>
            {canShare && (
              <Button
                variant="light"
                leftSection={<IconShare size={16} />}
                onClick={() => void navigator.share({ title: church.name, url }).catch(() => undefined)}
              >
                {t('publicForm.share')}
              </Button>
            )}
          </Group>
          <ButtonLink
            to="/orar/$slug/$token"
            params={{ slug, token: sent.token }}
            leftSection={<IconExternalLink size={16} />}
          >
            {t('publicForm.openLink')}
          </ButtonLink>
        </Stack>
      </PublicShell>
    );
  }

  const msg = (name: keyof Values) => {
    const m = form.formState.errors[name]?.message;
    if (!m) return undefined;
    return m === 'contact' ? t('publicForm.contactRequired') : t(`errors:validation.${m}` as never);
  };
  const orNull = (s: string) => (s.trim() === '' ? null : s.trim());

  const submit = form.handleSubmit(async (v) => {
    setError(null);
    try {
      const { token } = await publicPrayerApi.submit(slug, {
        body: v.body,
        name: orNull(v.name),
        phone: orNull(v.phone),
        email: orNull(v.email),
        wantsContact: v.wantsContact,
        wallShare: v.wallShare,
        consent: true,
        locale: i18n.resolvedLanguage ?? 'es',
        ...(captcha ? { turnstileToken: captcha } : {}),
        ...(v.website ? { website: v.website } : {}),
      });
      setSent({ token, email: Boolean(orNull(v.email)) });
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(err);
    }
  });

  return (
    <PublicShell logo={church.logoUrl} name={church.name}>
      <form onSubmit={submit} noValidate>
        <Stack gap="md">
          <div>
            <Title order={1} size="h3">
              {t('publicForm.title')}
            </Title>
            <Text c="dimmed" size="sm" mt={6}>
              {t('publicForm.subtitle', { church: church.name })}
            </Text>
          </div>
          <FormError error={error} />
          <Textarea
            label={t('publicForm.body')}
            placeholder={t('form.bodyPlaceholder')}
            required
            autosize
            minRows={4}
            maxLength={1000}
            error={msg('body')}
            {...form.register('body')}
          />
          <TextInput
            label={t('publicForm.name')}
            description={t('publicForm.nameHint')}
            autoComplete="name"
            maxLength={150}
            {...form.register('name')}
          />
          <SimpleGrid cols={{ base: 1, xs: 2 }}>
            <TextInput
              label={t('publicForm.phone')}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+54 9 11 …"
              error={msg('phone')}
              {...form.register('phone')}
            />
            <TextInput
              label={t('publicForm.email')}
              type="email"
              inputMode="email"
              autoComplete="email"
              error={msg('email')}
              {...form.register('email')}
            />
          </SimpleGrid>
          <Checkbox
            label={t('publicForm.wantsContact')}
            description={t('publicForm.wantsContactHint')}
            {...form.register('wantsContact')}
          />
          <Controller
            control={form.control}
            name="wallShare"
            render={({ field }) => (
              <Radio.Group
                label={t('publicForm.wallShare')}
                description={t('publicForm.wallShareHint')}
                value={field.value}
                onChange={field.onChange}
              >
                <Stack gap="xs" mt="xs">
                  {WALL_SHARES.map((w) => (
                    <Radio key={w} value={w} label={t(`publicForm.wall.${w}`)} />
                  ))}
                </Stack>
              </Radio.Group>
            )}
          />
          {/* Trampa para bots: invisible y fuera del orden de tabulación. */}
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            style={{ position: 'absolute', left: -10000, width: 1, height: 1, opacity: 0 }}
            {...form.register('website')}
          />
          <Checkbox
            label={t('publicForm.consent', { church: church.name })}
            error={msg('consent')}
            {...form.register('consent')}
          />
          {turnstileSiteKey && (
            <Stack gap={4}>
              <Text size="xs" c="dimmed">
                {t('publicForm.captcha')}
              </Text>
              <Turnstile
                siteKey={turnstileSiteKey}
                onToken={setCaptcha}
                language={i18n.resolvedLanguage ?? 'es'}
              />
            </Stack>
          )}
          {turnstileSiteKey && !captcha && form.formState.isSubmitted && (
            <Alert color="yellow" variant="light">
              {t('errors:codes.CAPTCHA_FAILED')}
            </Alert>
          )}
          <Button
            type="submit"
            size="md"
            loading={form.formState.isSubmitting}
            disabled={Boolean(turnstileSiteKey) && !captcha}
          >
            {t('publicForm.submit')}
          </Button>
        </Stack>
      </form>
    </PublicShell>
  );
}
