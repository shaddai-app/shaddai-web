import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Loader,
  NumberInput,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconHeadset, IconKey } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import {
  ACCOUNT_STATUSES,
  platformApi,
  type AccountAdmin,
  type AccountStatus,
  type PlatformAccount,
} from '../../../../api/platform';
import { FormError } from '../../../../components/FormError';
import { ResponsiveModal } from '../../../../components/ResponsiveModal';
import { showTemporaryAccess } from '../../../../components/TemporaryAccess';
import { PlatformBilling } from '../../../../features/billing/PlatformBilling';
import { DemoResetCard } from '../../../../features/platform/DemoResetCard';
import { ImpersonateModal } from '../../../../features/platform/ImpersonateModal';
import { StatusBadge } from '../../../../features/platform/StatusBadge';
import { LANGUAGES } from '../../../../i18n';
import { errorMessage } from '../../../../i18n/errors';
import { PageHeader } from '../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_platform/plataforma/cuentas/$id')({
  component: AccountDetail,
});

const CURRENCIES = ['ARS', 'USD', 'EUR', 'BRL', 'UYU', 'CLP', 'PYG', 'BOB', 'PEN', 'COP', 'MXN'];
const text = (max: number) => z.string().trim().max(max);

const schema = z.object({
  name: z.string().trim().min(2, 'required').max(150),
  planId: z.string().min(1),
  userLimit: z.number().int().min(1),
  storageLimitMb: z.number().int().min(0),
  trialEndsAt: z.string(),
  defaultLocale: z.enum(['es', 'en', 'pt']),
  timezone: z.string().min(1),
  currency: z.string().length(3),
  legalName: text(150),
  taxId: z.union([
    z.literal(''),
    z
      .string()
      .trim()
      .regex(/^\d{2}-?\d{8}-?\d$/, 'taxId'),
  ]),
  taxCondition: text(30),
  email: z.union([z.literal(''), z.string().trim().pipe(z.email('email'))]),
  phone: text(30),
  address: text(250),
  notes: text(4000),
});
type Values = z.infer<typeof schema>;

const toForm = (a: PlatformAccount): Values => ({
  name: a.name,
  planId: String(a.planId),
  userLimit: a.userLimit,
  storageLimitMb: a.storageLimitMb,
  trialEndsAt: a.trialEndsAt ? dayjs(a.trialEndsAt).format('YYYY-MM-DD') : '',
  defaultLocale: a.defaultLocale,
  timezone: a.timezone,
  currency: a.currency,
  legalName: a.legalName ?? '',
  taxId: a.taxId ?? '',
  taxCondition: a.taxCondition ?? '',
  email: a.email ?? '',
  phone: a.phone ?? '',
  address: a.address ?? '',
  notes: a.notes ?? '',
});

const orNull = (v: string) => (v.trim() === '' ? null : v.trim());

function Section({ title, children, extra }: { title: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <Card withBorder radius="lg" padding="lg">
      <Group justify="space-between" mb="md">
        <Title order={2} size="h4">
          {title}
        </Title>
        {extra}
      </Group>
      <Stack gap="md">{children}</Stack>
    </Card>
  );
}

function EditForm({ account }: { account: PlatformAccount }) {
  const { t } = useTranslation(['platform', 'admin', 'common', 'errors']);
  const queryClient = useQueryClient();
  const plans = useQuery({ queryKey: ['platform', 'plans'], queryFn: platformApi.plans });
  const [error, setError] = useState<unknown>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toForm(account) });

  const submit = form.handleSubmit(async (v) => {
    setError(null);
    try {
      const updated = await platformApi.updateAccount(account.id, {
        name: v.name,
        planId: Number(v.planId),
        userLimit: v.userLimit,
        storageLimitMb: v.storageLimitMb,
        trialEndsAt: v.trialEndsAt ? dayjs(v.trialEndsAt).endOf('day').toISOString() : null,
        defaultLocale: v.defaultLocale,
        timezone: v.timezone,
        currency: v.currency,
        legalName: orNull(v.legalName),
        taxId: orNull(v.taxId),
        taxCondition: orNull(v.taxCondition),
        email: orNull(v.email),
        phone: orNull(v.phone),
        address: orNull(v.address),
        notes: orNull(v.notes),
      });
      queryClient.setQueryData(['platform', 'account', account.id], updated);
      await queryClient.invalidateQueries({ queryKey: ['platform', 'accounts'] });
      form.reset(toForm(updated));
      notifications.show({ color: 'teal', message: t('detail.saved') });
    } catch (err) {
      setError(err);
    }
  });

  const msg = (name: keyof Values) => {
    const m = form.formState.errors[name]?.message;
    return m ? t(`errors:validation.${m}` as never) : undefined;
  };

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap="lg">
        <FormError error={error} />
        <Section title={t('detail.edit')}>
          <TextInput label={t('create.name')} error={msg('name')} {...form.register('name')} />
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Controller
              control={form.control}
              name="planId"
              render={({ field }) => (
                <Select
                  label={t('create.plan')}
                  data={(plans.data?.items ?? []).map((p) => ({ value: String(p.id), label: p.name }))}
                  value={field.value}
                  onChange={(v) => v && field.onChange(v)}
                  allowDeselect={false}
                />
              )}
            />
            <TextInput type="date" label={t('detail.trialEndsAt')} {...form.register('trialEndsAt')} />
            <Controller
              control={form.control}
              name="userLimit"
              render={({ field }) => (
                <NumberInput
                  label={t('create.userLimit')}
                  min={1}
                  value={field.value}
                  onChange={(v) => field.onChange(Number(v) || 1)}
                />
              )}
            />
            <Controller
              control={form.control}
              name="storageLimitMb"
              render={({ field }) => (
                <NumberInput
                  label={t('create.storageLimitMb')}
                  min={0}
                  value={field.value}
                  onChange={(v) => field.onChange(Number(v) || 0)}
                />
              )}
            />
          </SimpleGrid>
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
            <TextInput label={t('admin:account.fields.timezone')} {...form.register('timezone')} />
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

        <Section title={t('detail.billing')}>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label={t('admin:account.fields.legalName')} {...form.register('legalName')} />
            <TextInput
              label={t('admin:account.fields.taxId')}
              placeholder="30-12345678-9"
              error={msg('taxId')}
              {...form.register('taxId')}
            />
            <TextInput label={t('admin:account.fields.taxCondition')} {...form.register('taxCondition')} />
            <TextInput
              label={t('admin:account.fields.email')}
              error={msg('email')}
              {...form.register('email')}
            />
            <TextInput label={t('admin:account.fields.phone')} {...form.register('phone')} />
            <TextInput label={t('admin:account.fields.address')} {...form.register('address')} />
          </SimpleGrid>
          <Textarea
            label={t('detail.notes')}
            description={t('detail.notesHint')}
            autosize
            minRows={3}
            {...form.register('notes')}
          />
        </Section>

        <Group justify="flex-end">
          <Button type="submit" loading={form.formState.isSubmitting} disabled={!form.formState.isDirty}>
            {t('common:actions.save')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

function StatusForm({ account, onClose }: { account: PlatformAccount; onClose: () => void }) {
  const { t } = useTranslation(['platform', 'common', 'errors']);
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AccountStatus>(account.status);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const danger = status === 'suspended' || status === 'closed';

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const updated = await platformApi.changeStatus(account.id, status, reason.trim());
      queryClient.setQueryData(['platform', 'account', account.id], updated);
      await queryClient.invalidateQueries({ queryKey: ['platform', 'accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'stats'] });
      notifications.show({ color: 'teal', message: t('detail.statusChanged') });
      onClose();
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <Stack gap="md">
      <FormError error={error} />
      <Select
        label={t('detail.newStatus')}
        // La demo existe siempre: no se suspende ni se cierra (se restablece).
        data={ACCOUNT_STATUSES.filter((s) => !account.isDemo || (s !== 'suspended' && s !== 'closed')).map(
          (s) => ({ value: s, label: t(`status.${s}`) }),
        )}
        value={status}
        onChange={(v) => v && setStatus(v as AccountStatus)}
        allowDeselect={false}
      />
      {status !== account.status && (
        <Alert
          color={danger ? 'red' : 'blue'}
          variant="light"
          icon={danger ? <IconAlertTriangle size={18} /> : undefined}
        >
          {t(`detail.statusWarnings.${status}`)}
        </Alert>
      )}
      <Textarea
        label={t('detail.reason')}
        description={t('detail.reasonHint')}
        autosize
        minRows={2}
        value={reason}
        onChange={(e) => setReason(e.currentTarget.value)}
      />
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          {t('common:actions.cancel')}
        </Button>
        <Button
          color={danger ? 'red' : undefined}
          onClick={() => void submit()}
          loading={busy}
          disabled={status === account.status || reason.trim().length < 3}
        >
          {t('detail.changeStatus')}
        </Button>
      </Group>
    </Stack>
  );
}

function AdminRow({
  account,
  admin,
  onImpersonate,
}: {
  account: PlatformAccount;
  admin: AccountAdmin;
  onImpersonate: () => void;
}) {
  const { t } = useTranslation(['platform', 'common']);
  const queryClient = useQueryClient();
  const name = `${admin.firstName} ${admin.lastName}`;
  const locked = admin.lockedUntil !== null && dayjs(admin.lockedUntil).isAfter(dayjs());
  const canSupport = admin.isActive && !['suspended', 'closed'].includes(account.status);

  const reset = () =>
    modals.openConfirmModal({
      title: t('detail.resetPassword'),
      children: <Text size="sm">{t('detail.resetConfirm', { name })}</Text>,
      labels: { confirm: t('detail.resetPassword'), cancel: t('common:actions.cancel') },
      onConfirm: async () => {
        try {
          const res = await platformApi.resetAdmin(account.id, admin.id, false);
          showTemporaryAccess({
            title: t('detail.resetTitle'),
            name,
            email: admin.email,
            password: res.temporaryPassword,
          });
          await queryClient.invalidateQueries({ queryKey: ['platform', 'account', account.id] });
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  return (
    <Group justify="space-between" align="flex-start" py="xs" wrap="wrap" gap="xs">
      <div style={{ minWidth: 0 }}>
        <Group gap={6}>
          <Text size="sm" fw={500}>
            {name}
          </Text>
          {admin.isAccountOwner && <Badge size="xs">{t('detail.owner')}</Badge>}
          {!admin.isActive && (
            <Badge size="xs" color="gray" variant="light">
              {t('detail.inactive')}
            </Badge>
          )}
          {locked && (
            <Badge size="xs" color="red" variant="light">
              {t('detail.locked')}
            </Badge>
          )}
          {admin.mustChangePassword && (
            <Badge size="xs" color="yellow" variant="light">
              {t('detail.pendingPassword')}
            </Badge>
          )}
        </Group>
        <Text size="xs" c="dimmed">
          {admin.email} ·{' '}
          {t('detail.lastLogin', {
            date: admin.lastLoginAt ? dayjs(admin.lastLoginAt).format('L LT') : t('detail.never'),
          })}
        </Text>
      </div>
      <Group gap="xs">
        <Button size="xs" variant="light" leftSection={<IconKey size={14} />} onClick={reset}>
          {t('detail.resetPassword')}
        </Button>
        <Button
          size="xs"
          variant="light"
          color="orange"
          leftSection={<IconHeadset size={14} />}
          onClick={onImpersonate}
          disabled={!canSupport}
        >
          {t('detail.impersonate')}
        </Button>
      </Group>
    </Group>
  );
}

function AccountDetail() {
  const { t } = useTranslation(['platform', 'common']);
  const { id } = Route.useParams();
  const accountId = Number(id);
  const account = useQuery({
    queryKey: ['platform', 'account', accountId],
    queryFn: () => platformApi.account(accountId),
  });
  const [statusOpen, setStatusOpen] = useState(false);
  const [supportTarget, setSupportTarget] = useState<{ id: number; name: string } | null>(null);

  if (account.isPending) return <Loader />;
  if (!account.data) return <FormError error={account.error} />;
  const a = account.data;
  const pct = (used: number, limit: number) => (limit > 0 ? Math.min(100, (used / limit) * 100) : 100);

  return (
    <>
      <PageHeader
        title={a.name}
        description={a.slug}
        actions={
          <Group gap="sm">
            <Anchor component={Link} to="/plataforma" size="sm">
              {t('detail.back')}
            </Anchor>
            <Button variant="light" onClick={() => setStatusOpen(true)}>
              {t('detail.changeStatus')}
            </Button>
          </Group>
        }
      />
      <Grid gap="lg">
        <Grid.Col span={{ base: 12, lg: 4 }} order={{ base: 1, lg: 2 }}>
          <Stack gap="lg">
            {a.isDemo && <DemoResetCard account={a} />}
            <Section title={t('detail.usage')} extra={<StatusBadge status={a.status} size="md" />}>
              <Text size="sm">
                {t('detail.plan')}: <b>{a.plan.name}</b>
              </Text>
              <div>
                <Group justify="space-between" mb={4}>
                  <Text size="sm">{t('detail.users')}</Text>
                  <Text size="sm" c="dimmed">
                    {a.usage.activeUsers} / {a.usage.userLimit}
                  </Text>
                </Group>
                <Progress value={pct(a.usage.activeUsers, a.usage.userLimit)} />
              </div>
              <div>
                <Group justify="space-between" mb={4}>
                  <Text size="sm">{t('detail.storage')}</Text>
                  <Text size="sm" c="dimmed">
                    {a.usage.storageUsedMb.toFixed(2)} / {a.storageLimitMb} MB
                  </Text>
                </Group>
                <Progress value={pct(a.usage.storageUsedMb, a.storageLimitMb)} />
              </div>
              <Text size="xs" c="dimmed">
                {t('detail.created', { date: dayjs(a.createdAt).format('L') })}
              </Text>
              {a.purgeAfter && (
                <Alert color="red" variant="light">
                  {t('detail.purgeAfter', { date: dayjs(a.purgeAfter).format('L') })}
                </Alert>
              )}
            </Section>
            <Section title={t('detail.admins')}>
              <Stack gap={0}>
                {a.admins.map((admin) => (
                  <AdminRow
                    key={admin.id}
                    account={a}
                    admin={admin}
                    onImpersonate={() =>
                      setSupportTarget({ id: admin.id, name: `${admin.firstName} ${admin.lastName}` })
                    }
                  />
                ))}
              </Stack>
            </Section>
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 8 }} order={{ base: 2, lg: 1 }}>
          {/* key: al guardar o cambiar de cuenta, el formulario arranca de los datos nuevos. */}
          <Stack gap="lg">
            <EditForm key={`${a.id}-${account.dataUpdatedAt}`} account={a} />
            <PlatformBilling accountId={a.id} />
          </Stack>
        </Grid.Col>
      </Grid>

      <ResponsiveModal
        opened={statusOpen}
        onClose={() => setStatusOpen(false)}
        size="md"
        title={t('detail.statusTitle', { name: a.name })}
      >
        <StatusForm account={a} onClose={() => setStatusOpen(false)} />
      </ResponsiveModal>
      <ImpersonateModal target={supportTarget} onClose={() => setSupportTarget(null)} />
    </>
  );
}
