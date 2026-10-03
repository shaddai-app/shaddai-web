import { Alert, Badge, Button, Card, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconCreditCard, IconFlask } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { billingApi, type BillingOverview } from '../../../../api/billing';
import { requirePermission } from '../../../../auth/guards';
import { FormError } from '../../../../components/FormError';
import { InvoiceList, PlanSummary } from '../../../../features/billing/BillingParts';
import { DemoBlocked } from '../../../../features/demo/DemoNotice';
import { useMoney } from '../../../../features/finance/common';
import { SUPPORT_EMAIL } from '../../../../features/legal/constants';
import { errorMessage } from '../../../../i18n/errors';
import { PageHeader } from '../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/admin/facturacion')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'cuenta.configurar'),
  // simular: vuelta del "checkout" del proveedor de prueba (desarrollo).
  validateSearch: z.object({ simular: z.string().optional() }),
  component: BillingPage,
});

const billingKey = ['billing'] as const;

function SubscriptionCard({ billing }: { billing: BillingOverview }) {
  const { t } = useTranslation(['billing', 'common']);
  const money = useMoney();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const sub = billing.subscription;
  const fake = billing.provider === 'fake';

  // Cambió el estado de la cuenta (ej. pasó a activa): se refresca también la sesión (banner, permisos).
  const refresh = async (data?: BillingOverview) => {
    if (data) queryClient.setQueryData(billingKey, data);
    await queryClient.invalidateQueries({ queryKey: billingKey });
    await queryClient.invalidateQueries({ queryKey: ['me'] });
  };

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    try {
      await action();
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  };

  const subscribe = () =>
    run('subscribe', async () => {
      const { checkoutUrl } = await billingApi.subscribe();
      // Al checkout del proveedor (sale de la app y vuelve a esta página).
      if (checkoutUrl) window.location.assign(checkoutUrl);
      else await refresh();
    });

  const cancel = () =>
    modals.openConfirmModal({
      title: t('cancel.title'),
      children: (
        <Text size="sm">
          {t('cancel.body', { date: billing.paidUntil ? dayjs(billing.paidUntil).format('L') : '—' })}
        </Text>
      ),
      labels: { confirm: t('cancel.confirm'), cancel: t('cancel.keep') },
      confirmProps: { color: 'red' },
      onConfirm: () =>
        void run('cancel', async () => {
          await refresh(await billingApi.cancel());
          notifications.show({ color: 'teal', message: t('cancel.done') });
        }),
    });

  const simulate = (status: 'approved' | 'rejected') =>
    run(status, async () => {
      await refresh(await billingApi.simulatePayment(status));
      notifications.show({
        color: status === 'approved' ? 'teal' : 'yellow',
        message: status === 'approved' ? t('fake.approved') : t('fake.rejected'),
      });
    });

  if (billing.provider === 'none') {
    return (
      <Card withBorder radius="lg">
        <Title order={3} size="h5" mb="xs">
          {t('auto.title')}
        </Title>
        <Text size="sm">{t('auto.disabled', { email: SUPPORT_EMAIL })}</Text>
      </Card>
    );
  }

  const open = sub && sub.status !== 'cancelled';
  return (
    <Card withBorder radius="lg">
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Title order={3} size="h5">
            {t('auto.title')}
          </Title>
          {fake && (
            <Badge variant="light" color="grape" leftSection={<IconFlask size={12} />}>
              {t('fake.badge')}
            </Badge>
          )}
        </Group>
        {!open ? (
          <>
            <Text size="sm">{sub?.status === 'cancelled' ? t('auto.cancelled') : t('auto.none')}</Text>
            <Button
              leftSection={<IconCreditCard size={18} />}
              onClick={subscribe}
              loading={busy === 'subscribe'}
              disabled={billing.plan.priceArs === null}
              style={{ alignSelf: 'flex-start' }}
            >
              {t('auto.subscribe')}
            </Button>
            {billing.plan.priceArs === null && (
              <Text size="xs" c="dimmed">
                {t('auto.noPrice', { email: SUPPORT_EMAIL })}
              </Text>
            )}
          </>
        ) : sub.status === 'pending' ? (
          <>
            <Text size="sm">{t('auto.pending')}</Text>
            <Group gap="xs">
              {sub.checkoutUrl && !fake && (
                <Button onClick={() => window.location.assign(sub.checkoutUrl!)}>{t('auto.continue')}</Button>
              )}
              <Button variant="default" onClick={subscribe} loading={busy === 'subscribe'}>
                {t('auto.restart')}
              </Button>
            </Group>
          </>
        ) : (
          <>
            <Text size="sm">
              {sub.status === 'paused'
                ? t('auto.paused')
                : t('auto.authorized', { amount: money(sub.amount, sub.currency, { whole: true }) })}
            </Text>
            {sub.nextPaymentAt && (
              <Text size="sm" c="dimmed">
                {t('auto.next', { date: dayjs(sub.nextPaymentAt).format('L') })}
              </Text>
            )}
            <Button
              variant="subtle"
              color="red"
              onClick={cancel}
              loading={busy === 'cancel'}
              style={{ alignSelf: 'flex-start' }}
            >
              {t('auto.cancel')}
            </Button>
          </>
        )}
        {fake && open && (
          <Alert color="grape" variant="light" icon={<IconFlask size={18} />} title={t('fake.title')}>
            <Stack gap="xs">
              <Text size="sm">{t('fake.body')}</Text>
              <Group gap="xs">
                <Button
                  size="xs"
                  color="teal"
                  onClick={() => void simulate('approved')}
                  loading={busy === 'approved'}
                >
                  {t('fake.approve')}
                </Button>
                <Button
                  size="xs"
                  variant="default"
                  onClick={() => void simulate('rejected')}
                  loading={busy === 'rejected'}
                >
                  {t('fake.reject')}
                </Button>
              </Group>
            </Stack>
          </Alert>
        )}
      </Stack>
    </Card>
  );
}

function BillingPage() {
  const { t } = useTranslation('billing');
  const { simular } = Route.useSearch();
  const { me } = Route.useRouteContext();
  const billing = useQuery({ queryKey: billingKey, queryFn: billingApi.overview });

  return (
    <Stack gap="md" maw={720}>
      <PageHeader title={t('title')} description={t('description')} />
      {simular && billing.data?.subscription?.status === 'pending' && (
        <Alert color="grape" variant="light" icon={<IconFlask size={18} />}>
          {t('fake.returned')}
        </Alert>
      )}
      {me.account?.isDemo ? (
        <DemoBlocked what="billing" />
      ) : billing.isPending ? (
        <Loader />
      ) : billing.isError ? (
        <FormError error={billing.error} />
      ) : (
        <>
          <PlanSummary billing={billing.data} />
          <SubscriptionCard billing={billing.data} />
          <InvoiceList billing={billing.data} />
        </>
      )}
    </Stack>
  );
}
