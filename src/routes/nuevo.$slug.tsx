import {
  Alert,
  Box,
  Button,
  Center,
  Checkbox,
  Group,
  Image,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconCircleCheck, IconCross } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { publicApi } from '../api/people';
import { FormError } from '../components/FormError';
import { Turnstile } from '../components/Turnstile';
import { ColorSchemeToggle } from '../layout/ColorSchemeToggle';
import { LanguageMenu } from '../layout/LanguageMenu';

// Página pública (sin sesión): la abre quien escanea el QR en el culto.
export const Route = createFileRoute('/nuevo/$slug')({
  component: NewcomerFormPage,
});

const optional = z.string().trim();
const schema = z
  .object({
    firstName: z.string().trim().min(1, 'required').max(80),
    lastName: z.string().trim().min(1, 'required').max(80),
    phone: optional.max(30),
    email: z.union([z.literal(''), z.string().trim().pipe(z.email('email'))]),
    city: optional.max(100),
    address: optional.max(250),
    birthDate: optional,
    howHeard: optional.max(200),
    prayer: optional.max(1000),
    wantsVisit: z.boolean(),
    consent: z.boolean().refine((v) => v, 'required'),
    website: z.string(), // trampa para bots (campo oculto)
  })
  .refine((v) => v.phone.trim() !== '' || v.email.trim() !== '', { path: ['phone'], message: 'contact' });
type Values = z.infer<typeof schema>;

const empty: Values = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  city: '',
  address: '',
  birthDate: '',
  howHeard: '',
  prayer: '',
  wantsVisit: false,
  consent: false,
  website: '',
};

function Shell({ logo, name, children }: { logo?: string | null; name?: string; children: React.ReactNode }) {
  return (
    <Box mih="100dvh" bg="var(--mantine-color-body)">
      <Group justify="flex-end" p="sm" gap={4}>
        <LanguageMenu />
        <ColorSchemeToggle />
      </Group>
      <Center px="md" pb="xl">
        <Stack w="100%" maw={520} gap="lg">
          <Stack align="center" gap={6}>
            {logo ? (
              <Image src={logo} alt="" w={64} h={64} radius="md" fit="contain" />
            ) : (
              <ThemeIcon size={56} radius="lg" aria-hidden>
                <IconCross size={30} />
              </ThemeIcon>
            )}
            {name && (
              <Text fw={600} size="lg" ta="center">
                {name}
              </Text>
            )}
          </Stack>
          <Paper withBorder radius="lg" p={{ base: 'lg', sm: 'xl' }} shadow="xs">
            {children}
          </Paper>
        </Stack>
      </Center>
    </Box>
  );
}

function NewcomerFormPage() {
  const { slug } = Route.useParams();
  const { t, i18n } = useTranslation(['people', 'errors', 'common']);
  const config = useQuery({
    queryKey: ['public-form', slug],
    queryFn: () => publicApi.form(slug),
    retry: false,
  });
  const [token, setToken] = useState<string | null>(null);
  const [sentName, setSentName] = useState<string | null>(null);
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
      <Shell>
        <Text ta="center">{t('publicForm.notFound')}</Text>
      </Shell>
    );
  }
  const { church, turnstileSiteKey } = config.data;

  if (sentName) {
    return (
      <Shell logo={church.logoUrl} name={church.name}>
        <Stack align="center" ta="center" gap="sm">
          <IconCircleCheck size={48} color="var(--mantine-color-teal-6)" />
          <Title order={1} size="h3">
            {t('publicForm.thanksTitle', { name: sentName })}
          </Title>
          <Text c="dimmed">{t('publicForm.thanksBody')}</Text>
          <Button
            variant="subtle"
            onClick={() => {
              form.reset(empty);
              setToken(null);
              setSentName(null);
            }}
          >
            {t('publicForm.another')}
          </Button>
        </Stack>
      </Shell>
    );
  }

  const msg = (name: keyof Values) => {
    const m = form.formState.errors[name]?.message;
    if (!m) return undefined;
    return m === 'contact' ? t('publicForm.contactHint') : t(`errors:validation.${m}` as never);
  };
  const orNull = (s: string) => (s.trim() === '' ? null : s.trim());

  const submit = form.handleSubmit(async (v) => {
    setError(null);
    try {
      await publicApi.submit(slug, {
        firstName: v.firstName,
        lastName: v.lastName,
        phone: orNull(v.phone),
        email: orNull(v.email),
        city: orNull(v.city),
        address: orNull(v.address),
        birthDate: orNull(v.birthDate),
        howHeard: orNull(v.howHeard),
        prayer: orNull(v.prayer),
        wantsVisit: v.wantsVisit,
        consent: true,
        locale: i18n.resolvedLanguage ?? 'es',
        ...(token ? { turnstileToken: token } : {}),
        ...(v.website ? { website: v.website } : {}),
      });
      setSentName(v.firstName);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(err);
    }
  });

  return (
    <Shell logo={church.logoUrl} name={church.name}>
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
          <SimpleGrid cols={{ base: 1, xs: 2 }}>
            <TextInput
              label={t('publicForm.firstName')}
              required
              autoComplete="given-name"
              error={msg('firstName')}
              {...form.register('firstName')}
            />
            <TextInput
              label={t('publicForm.lastName')}
              required
              autoComplete="family-name"
              error={msg('lastName')}
              {...form.register('lastName')}
            />
          </SimpleGrid>
          <TextInput
            label={t('publicForm.phone')}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            description={t('publicForm.contactHint')}
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
          <TextInput label={t('publicForm.city')} autoComplete="address-level2" {...form.register('city')} />
          <TextInput
            label={t('publicForm.address')}
            autoComplete="street-address"
            {...form.register('address')}
          />
          <TextInput
            label={t('publicForm.birthDate')}
            type="date"
            max={dayjs().format('YYYY-MM-DD')}
            autoComplete="bday"
            {...form.register('birthDate')}
          />
          <TextInput label={t('publicForm.howHeard')} maxLength={200} {...form.register('howHeard')} />
          <Textarea
            label={t('publicForm.prayer')}
            autosize
            minRows={2}
            maxLength={1000}
            {...form.register('prayer')}
          />
          <Checkbox label={t('publicForm.wantsVisit')} {...form.register('wantsVisit')} />
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
                onToken={setToken}
                language={i18n.resolvedLanguage ?? 'es'}
              />
            </Stack>
          )}
          {turnstileSiteKey && !token && form.formState.isSubmitted && (
            <Alert color="yellow" variant="light">
              {t('errors:codes.CAPTCHA_FAILED')}
            </Alert>
          )}
          <Button
            type="submit"
            size="md"
            loading={form.formState.isSubmitting}
            disabled={Boolean(turnstileSiteKey) && !token}
          >
            {t('publicForm.submit')}
          </Button>
        </Stack>
      </form>
    </Shell>
  );
}
