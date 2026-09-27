import {
  Anchor,
  Button,
  Card,
  Checkbox,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  Input,
} from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { platformApi } from '../../../../api/platform';
import { FormError } from '../../../../components/FormError';
import { showTemporaryAccess } from '../../../../components/TemporaryAccess';
import { LANGUAGES } from '../../../../i18n';
import { PageHeader } from '../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_platform/plataforma/cuentas/nueva')({
  component: NewAccountPage,
});

const CURRENCIES = ['ARS', 'USD', 'EUR', 'BRL', 'UYU', 'CLP', 'PYG', 'BOB', 'PEN', 'COP', 'MXN'];

const schema = z.object({
  name: z.string().trim().min(2, 'required').max(150),
  slug: z.union([
    z.literal(''),
    z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug')
      .max(60),
  ]),
  planId: z.string().min(1, 'required'),
  userLimit: z.union([z.literal(''), z.number().int().min(1)]),
  storageLimitMb: z.union([z.literal(''), z.number().int().min(0)]),
  defaultLocale: z.enum(['es', 'en', 'pt']),
  timezone: z.string().min(1),
  currency: z.string().length(3),
  status: z.enum(['trial', 'active']),
  trialDays: z.number().int().min(1).max(365),
  adminEmail: z.string().trim().min(1, 'required').pipe(z.email('email')),
  adminFirstName: z.string().trim().min(1, 'required').max(80),
  adminLastName: z.string().trim().min(1, 'required').max(80),
  sendAccessEmail: z.boolean(),
});
type Values = z.infer<typeof schema>;

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card withBorder radius="lg" padding="lg">
      <Title order={2} size="h4">
        {title}
      </Title>
      {description && (
        <Text size="sm" c="dimmed" mt={4}>
          {description}
        </Text>
      )}
      <Stack gap="md" mt="md">
        {children}
      </Stack>
    </Card>
  );
}

function NewAccountPage() {
  const { t } = useTranslation(['platform', 'admin', 'common', 'errors']);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const plans = useQuery({ queryKey: ['platform', 'plans'], queryFn: platformApi.plans });
  const [error, setError] = useState<unknown>(null);
  const timezones = useMemo(() => {
    try {
      return Intl.supportedValuesOf('timeZone');
    } catch {
      return ['America/Argentina/Buenos_Aires'];
    }
  }, []);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      slug: '',
      planId: '',
      userLimit: '',
      storageLimitMb: '',
      defaultLocale: 'es',
      timezone: 'America/Argentina/Buenos_Aires',
      currency: 'ARS',
      status: 'trial',
      trialDays: 30,
      adminEmail: '',
      adminFirstName: '',
      adminLastName: '',
      sendAccessEmail: false,
    },
  });
  const status = useWatch({ control: form.control, name: 'status' });

  const submit = form.handleSubmit(async (v) => {
    setError(null);
    try {
      const res = await platformApi.createAccount({
        name: v.name,
        slug: v.slug || undefined,
        planId: Number(v.planId),
        userLimit: v.userLimit === '' ? undefined : v.userLimit,
        storageLimitMb: v.storageLimitMb === '' ? undefined : v.storageLimitMb,
        defaultLocale: v.defaultLocale,
        timezone: v.timezone,
        currency: v.currency,
        status: v.status,
        trialDays: v.trialDays,
        admin: { email: v.adminEmail, firstName: v.adminFirstName, lastName: v.adminLastName },
        sendAccessEmail: v.sendAccessEmail,
      });
      await queryClient.invalidateQueries({ queryKey: ['platform'] });
      showTemporaryAccess({
        title: t('create.createdTitle'),
        name: `${v.adminFirstName} ${v.adminLastName}`,
        email: res.admin.email,
        password: res.temporaryPassword,
      });
      await navigate({ to: '/plataforma/cuentas/$id', params: { id: String(res.account.id) } });
    } catch (err) {
      setError(err);
    }
  });

  const msg = (name: keyof Values) => {
    const m = form.formState.errors[name]?.message;
    return m ? t(`errors:validation.${m}` as never) : undefined;
  };

  const activePlans = (plans.data?.items ?? []).filter((p) => p.isActive);

  return (
    <>
      <PageHeader
        title={t('create.title')}
        actions={
          <Anchor component={Link} to="/plataforma" size="sm">
            {t('detail.back')}
          </Anchor>
        }
      />
      <form onSubmit={submit} noValidate>
        <Stack gap="lg" maw={860}>
          <FormError error={error} />
          <Section title={t('create.church')}>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label={t('create.name')}
                data-autofocus
                error={msg('name')}
                {...form.register('name')}
              />
              <TextInput
                label={t('create.slug')}
                description={t('create.slugHint')}
                placeholder="iglesia-ejemplo"
                error={msg('slug')}
                {...form.register('slug')}
              />
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, sm: 3 }}>
              <Controller
                control={form.control}
                name="planId"
                render={({ field }) => (
                  <Select
                    label={t('create.plan')}
                    data={activePlans.map((p) => ({
                      value: String(p.id),
                      label: `${p.name} · ${p.userLimit} / ${p.storageLimitMb} MB`,
                    }))}
                    value={field.value || null}
                    onChange={(v) => field.onChange(v ?? '')}
                    error={msg('planId')}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="userLimit"
                render={({ field }) => (
                  <NumberInput
                    label={t('create.userLimit')}
                    description={t('create.limitsHint')}
                    min={1}
                    value={field.value}
                    onChange={(v) => field.onChange(v === '' ? '' : Number(v))}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="storageLimitMb"
                render={({ field }) => (
                  <NumberInput
                    label={t('create.storageLimitMb')}
                    description={t('create.limitsHint')}
                    min={0}
                    value={field.value}
                    onChange={(v) => field.onChange(v === '' ? '' : Number(v))}
                  />
                )}
              />
            </SimpleGrid>
          </Section>

          <Section title={t('create.region')}>
            <SimpleGrid cols={{ base: 1, sm: 3 }}>
              <Controller
                control={form.control}
                name="defaultLocale"
                render={({ field }) => (
                  <Select
                    label={t('admin:account.fields.defaultLocale')}
                    data={LANGUAGES.map((l) => ({ value: l, label: t(`common:language.${l}`) }))}
                    value={field.value}
                    onChange={(v) => v && field.onChange(v)}
                    allowDeselect={false}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <Select
                    label={t('admin:account.fields.timezone')}
                    data={timezones}
                    value={field.value}
                    onChange={(v) => v && field.onChange(v)}
                    allowDeselect={false}
                    searchable
                    limit={50}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <Select
                    label={t('admin:account.fields.currency')}
                    data={CURRENCIES}
                    value={field.value}
                    onChange={(v) => v && field.onChange(v)}
                    allowDeselect={false}
                  />
                )}
              />
            </SimpleGrid>
          </Section>

          <Section title={t('create.start')}>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Input.Wrapper label={t('create.status')}>
                    <SegmentedControl
                      mt={6}
                      fullWidth
                      value={field.value}
                      onChange={field.onChange}
                      data={(['trial', 'active'] as const).map((s) => ({
                        value: s,
                        label: t(`status.${s}`),
                      }))}
                    />
                  </Input.Wrapper>
                )}
              />
              {status === 'trial' && (
                <Controller
                  control={form.control}
                  name="trialDays"
                  render={({ field }) => (
                    <NumberInput
                      label={t('create.trialDays')}
                      min={1}
                      max={365}
                      value={field.value}
                      onChange={(v) => field.onChange(Number(v) || 30)}
                    />
                  )}
                />
              )}
            </SimpleGrid>
          </Section>

          <Section title={t('create.admin')} description={t('create.adminHint')}>
            <TextInput
              label={t('create.email')}
              type="email"
              inputMode="email"
              autoComplete="off"
              error={msg('adminEmail')}
              {...form.register('adminEmail')}
            />
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label={t('create.firstName')}
                error={msg('adminFirstName')}
                {...form.register('adminFirstName')}
              />
              <TextInput
                label={t('create.lastName')}
                error={msg('adminLastName')}
                {...form.register('adminLastName')}
              />
            </SimpleGrid>
            <Checkbox label={t('create.sendAccessEmail')} {...form.register('sendAccessEmail')} />
          </Section>

          <Group justify="flex-end">
            <Button type="submit" loading={form.formState.isSubmitting}>
              {t('create.submit')}
            </Button>
          </Group>
        </Stack>
      </form>
    </>
  );
}
