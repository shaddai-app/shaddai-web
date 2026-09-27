import {
  Avatar,
  Button,
  Card,
  CheckIcon,
  ColorSwatch,
  FileButton,
  Grid,
  Group,
  Loader,
  NumberInput,
  Progress,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
  UnstyledButton,
  useMantineTheme,
  Input,
} from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { notifications } from '@mantine/notifications';
import { IconPhoto, IconTrash, IconUpload } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { accountApi, type AccountSettings } from '../../../../api/admin';
import { requirePermission } from '../../../../auth/guards';
import { FormError } from '../../../../components/FormError';
import { useFileUrl } from '../../../../components/use-file-url';
import { LANGUAGES } from '../../../../i18n';
import { errorMessage } from '../../../../i18n/errors';
import { PageHeader } from '../../../../layout/PageHeader';
import { PRIMARY_PRESETS } from '../../../../theme/presets';

export const Route = createFileRoute('/_shell/_church/admin/cuenta')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'cuenta.configurar'),
  component: AccountSettingsPage,
});

const CURRENCIES = ['ARS', 'USD', 'EUR', 'BRL', 'UYU', 'CLP', 'PYG', 'BOB', 'PEN', 'COP', 'MXN'];
const optional = (max: number) => z.string().trim().max(max);

const schema = z.object({
  name: z.string().trim().min(2, 'required').max(150),
  email: z.union([z.literal(''), z.string().trim().pipe(z.email('email'))]),
  phone: optional(30),
  address: optional(250),
  ccliLicense: optional(20),
  defaultLocale: z.enum(['es', 'en', 'pt']),
  timezone: z.string().min(1),
  currency: z.string().length(3),
  weekStartsOn: z.enum(['0', '1']),
  primaryColor: z.enum(PRIMARY_PRESETS),
  networkLabel: optional(40),
  zoneLabel: optional(40),
  cellMultiplyTarget: z.number().int().min(2).max(200),
  cellReportEditDays: z.number().int().min(0).max(60),
  legalName: optional(150),
  taxId: z.union([
    z.literal(''),
    z
      .string()
      .trim()
      .regex(/^\d{2}-?\d{8}-?\d$/, 'taxId'),
  ]),
  taxCondition: optional(30),
});
type Values = z.infer<typeof schema>;

const toForm = (a: AccountSettings): Values => ({
  name: a.name,
  email: a.email ?? '',
  phone: a.phone ?? '',
  address: a.address ?? '',
  ccliLicense: a.ccliLicense ?? '',
  defaultLocale: a.defaultLocale,
  timezone: a.timezone,
  currency: a.currency,
  weekStartsOn: a.weekStartsOn === 0 ? '0' : '1',
  primaryColor: (PRIMARY_PRESETS as readonly string[]).includes(a.primaryColor)
    ? (a.primaryColor as Values['primaryColor'])
    : 'slate',
  networkLabel: a.structureLabels?.network ?? '',
  zoneLabel: a.structureLabels?.zone ?? '',
  cellMultiplyTarget: a.cellMultiplyTarget,
  cellReportEditDays: a.cellReportEditDays,
  legalName: a.legalName ?? '',
  taxId: a.taxId ?? '',
  taxCondition: a.taxCondition ?? '',
});

const orNull = (v: string) => (v.trim() === '' ? null : v.trim());

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card withBorder radius="lg" padding="lg">
      <Title order={2} size="h4" mb="md">
        {title}
      </Title>
      <Stack gap="md">{children}</Stack>
    </Card>
  );
}

function LogoSection({ account }: { account: AccountSettings }) {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();
  const url = useFileUrl(account.logoFileId);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await fn();
      notifications.show({ color: 'teal', message });
      await queryClient.invalidateQueries({ queryKey: ['account'] });
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title={t('account.sections.logo')}>
      <Group gap="lg" wrap="wrap">
        <Avatar src={url} size={96} radius="md" alt={account.name}>
          <IconPhoto size={32} aria-hidden />
        </Avatar>
        <Stack gap="xs">
          <Group gap="xs">
            <FileButton
              accept="image/png,image/jpeg,image/webp"
              onChange={(file) =>
                file && void run(() => accountApi.uploadLogo(file), t('account.logo.uploaded'))
              }
            >
              {(props) => (
                <Button {...props} leftSection={<IconUpload size={16} />} loading={busy} variant="light">
                  {account.logoFileId ? t('account.logo.replace') : t('account.logo.upload')}
                </Button>
              )}
            </FileButton>
            {account.logoFileId && (
              <Button
                variant="subtle"
                color="red"
                leftSection={<IconTrash size={16} />}
                disabled={busy}
                onClick={() => void run(() => accountApi.removeLogo(), t('account.logo.removed'))}
              >
                {t('account.logo.remove')}
              </Button>
            )}
          </Group>
          <Text size="xs" c="dimmed">
            {t('account.logo.hint')}
          </Text>
        </Stack>
      </Group>
    </Section>
  );
}

function UsageSection() {
  const { t } = useTranslation('admin');
  const usage = useQuery({ queryKey: ['account', 'usage'], queryFn: accountApi.usage });
  if (!usage.data) return null;
  const u = usage.data;
  const pct = (used: number, limit: number) => (limit > 0 ? Math.min(100, (used / limit) * 100) : 100);
  return (
    <Section title={t('account.sections.usage')}>
      <Text size="sm">
        {t('account.usage.plan')}: <b>{u.plan.name}</b>
      </Text>
      {u.status === 'trial' && u.trialEndsAt && (
        <Text size="sm" c="dimmed">
          {t('account.usage.trialEnds', { date: dayjs(u.trialEndsAt).format('L') })}
        </Text>
      )}
      <div>
        <Group justify="space-between" mb={4}>
          <Text size="sm">{t('account.usage.users')}</Text>
          <Text size="sm" c="dimmed">
            {u.activeUsers} / {u.userLimit}
          </Text>
        </Group>
        <Progress
          value={pct(u.activeUsers, u.userLimit)}
          color={u.activeUsers >= u.userLimit ? 'orange' : undefined}
        />
      </div>
      <div>
        <Group justify="space-between" mb={4}>
          <Text size="sm">{t('account.usage.storage')}</Text>
          <Text size="sm" c="dimmed">
            {u.storageUsedMb} MB / {u.storageLimitMb} MB
          </Text>
        </Group>
        <Progress value={pct(u.storageUsedMb, u.storageLimitMb)} />
      </div>
    </Section>
  );
}

function AccountSettingsPage() {
  const { t } = useTranslation(['admin', 'common', 'errors']);
  const theme = useMantineTheme();
  const queryClient = useQueryClient();
  const account = useQuery({ queryKey: ['account'], queryFn: accountApi.get });
  const [error, setError] = useState<unknown>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (account.data) form.reset(toForm(account.data));
  }, [account.data, form]);

  const timezones = useMemo(() => {
    try {
      return Intl.supportedValuesOf('timeZone');
    } catch {
      return ['America/Argentina/Buenos_Aires'];
    }
  }, []);

  const submit = form.handleSubmit(async (v) => {
    setError(null);
    try {
      await accountApi.update({
        name: v.name,
        email: orNull(v.email),
        phone: orNull(v.phone),
        address: orNull(v.address),
        ccliLicense: orNull(v.ccliLicense),
        defaultLocale: v.defaultLocale,
        timezone: v.timezone,
        currency: v.currency,
        weekStartsOn: Number(v.weekStartsOn),
        primaryColor: v.primaryColor,
        structureLabels:
          v.networkLabel || v.zoneLabel
            ? {
                ...(v.networkLabel ? { network: v.networkLabel } : {}),
                ...(v.zoneLabel ? { zone: v.zoneLabel } : {}),
              }
            : null,
        cellMultiplyTarget: v.cellMultiplyTarget,
        cellReportEditDays: v.cellReportEditDays,
        legalName: orNull(v.legalName),
        taxId: orNull(v.taxId),
        taxCondition: orNull(v.taxCondition),
      });
      notifications.show({ color: 'teal', message: t('account.saved') });
      // Color, idioma por defecto y nombre impactan en toda la app.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['account'] }),
        queryClient.invalidateQueries({ queryKey: ['me'] }),
      ]);
    } catch (err) {
      setError(err);
    }
  });

  const msg = (name: keyof Values) => {
    const m = form.formState.errors[name]?.message;
    if (!m) return undefined;
    return m === 'taxId' ? t('errors:validation.taxId' as never) : t(`errors:validation.${m}` as never);
  };

  if (account.isPending) return <Loader />;
  if (!account.data) return <FormError error={account.error} />;

  return (
    <>
      <PageHeader title={t('account.title')} />
      <Grid gap="lg">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <form onSubmit={submit} noValidate>
            <Stack gap="lg">
              <FormError error={error} />
              <Section title={t('account.sections.general')}>
                <TextInput label={t('account.fields.name')} error={msg('name')} {...form.register('name')} />
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <TextInput
                    label={t('account.fields.email')}
                    type="email"
                    error={msg('email')}
                    {...form.register('email')}
                  />
                  <TextInput label={t('account.fields.phone')} type="tel" {...form.register('phone')} />
                </SimpleGrid>
                <TextInput label={t('account.fields.address')} {...form.register('address')} />
                <TextInput label={t('account.fields.ccliLicense')} {...form.register('ccliLicense')} />
              </Section>

              <Section title={t('account.sections.appearance')}>
                <Controller
                  control={form.control}
                  name="primaryColor"
                  render={({ field }) => (
                    <Input.Wrapper label={t('account.fields.primaryColor')}>
                      <Group gap="sm" mt={8} role="radiogroup" aria-label={t('account.fields.primaryColor')}>
                        {PRIMARY_PRESETS.map((c) => (
                          <Tooltip key={c} label={t(`account.colors.${c}`)}>
                            <UnstyledButton
                              role="radio"
                              aria-checked={field.value === c}
                              aria-label={t(`account.colors.${c}`)}
                              onClick={() => field.onChange(c)}
                            >
                              <ColorSwatch
                                color={theme.colors[c]?.[6] ?? c}
                                size={40}
                                style={{ color: '#fff' }}
                              >
                                {field.value === c && <CheckIcon size={14} />}
                              </ColorSwatch>
                            </UnstyledButton>
                          </Tooltip>
                        ))}
                      </Group>
                    </Input.Wrapper>
                  )}
                />
              </Section>

              <Section title={t('account.sections.regional')}>
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <Controller
                    control={form.control}
                    name="defaultLocale"
                    render={({ field }) => (
                      <Select
                        label={t('account.fields.defaultLocale')}
                        description={t('account.fields.defaultLocaleHint')}
                        data={LANGUAGES.map((l) => ({ value: l, label: t(`common:language.${l}`) }))}
                        value={field.value}
                        onChange={(v) => v && field.onChange(v)}
                        allowDeselect={false}
                      />
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <Select
                        label={t('account.fields.currency')}
                        data={CURRENCIES}
                        value={field.value}
                        onChange={(v) => v && field.onChange(v)}
                        allowDeselect={false}
                        searchable
                      />
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="timezone"
                    render={({ field }) => (
                      <Select
                        label={t('account.fields.timezone')}
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
                    name="weekStartsOn"
                    render={({ field }) => (
                      <Input.Wrapper label={t('account.fields.weekStartsOn')}>
                        <SegmentedControl
                          mt={6}
                          fullWidth
                          value={field.value}
                          onChange={field.onChange}
                          data={[
                            { value: '1', label: t('account.fields.monday') },
                            { value: '0', label: t('account.fields.sunday') },
                          ]}
                        />
                      </Input.Wrapper>
                    )}
                  />
                </SimpleGrid>
              </Section>

              <Section title={t('account.sections.structure')}>
                <Text size="sm" c="dimmed">
                  {t('account.fields.labelsHint')}
                </Text>
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <TextInput
                    label={t('account.fields.networkLabel')}
                    placeholder="Red"
                    {...form.register('networkLabel')}
                  />
                  <TextInput
                    label={t('account.fields.zoneLabel')}
                    placeholder="Zona"
                    {...form.register('zoneLabel')}
                  />
                  <Controller
                    control={form.control}
                    name="cellMultiplyTarget"
                    render={({ field }) => (
                      <NumberInput
                        label={t('account.fields.cellMultiplyTarget')}
                        description={t('account.fields.cellMultiplyTargetHint')}
                        min={2}
                        max={200}
                        value={field.value}
                        onChange={(v) => field.onChange(Number(v) || 2)}
                      />
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="cellReportEditDays"
                    render={({ field }) => (
                      <NumberInput
                        label={t('account.fields.cellReportEditDays')}
                        min={0}
                        max={60}
                        value={field.value}
                        onChange={(v) => field.onChange(Number(v) || 0)}
                      />
                    )}
                  />
                </SimpleGrid>
              </Section>

              <Section title={t('account.sections.legal')}>
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <TextInput label={t('account.fields.legalName')} {...form.register('legalName')} />
                  <TextInput
                    label={t('account.fields.taxId')}
                    placeholder="30-12345678-9"
                    inputMode="numeric"
                    error={msg('taxId')}
                    {...form.register('taxId')}
                  />
                  <TextInput label={t('account.fields.taxCondition')} {...form.register('taxCondition')} />
                </SimpleGrid>
              </Section>

              <Group justify="flex-end">
                <Button
                  type="submit"
                  loading={form.formState.isSubmitting}
                  disabled={!form.formState.isDirty}
                >
                  {t('common:actions.save')}
                </Button>
              </Group>
            </Stack>
          </form>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Stack gap="lg">
            <LogoSection account={account.data} />
            <UsageSection />
          </Stack>
        </Grid.Col>
      </Grid>
    </>
  );
}
