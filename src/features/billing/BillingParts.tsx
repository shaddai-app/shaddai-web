import { Badge, Card, Divider, Group, Stack, Text, Title } from '@mantine/core';
import dayjs from 'dayjs';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import type { BillingOverview, InvoiceStatus } from '../../api/billing';
import { useMoney } from '../finance/common';

const ACCOUNT_STATUS_COLORS: Record<BillingOverview['status'], string> = {
  trial: 'blue',
  active: 'teal',
  past_due: 'yellow',
  suspended: 'red',
  closed: 'gray',
};

const INVOICE_COLORS: Record<InvoiceStatus, string> = {
  approved: 'teal',
  pending: 'blue',
  rejected: 'red',
  refunded: 'gray',
};

const day = (iso: string | null) => (iso ? dayjs(iso).format('L') : '—');

/** Plan, estado de la cuenta y hasta cuándo está pagado. */
export function PlanSummary({ billing }: { billing: BillingOverview }) {
  const { t } = useTranslation('billing');
  const money = useMoney();
  const expiredTrial =
    billing.status === 'trial' && billing.trialEndsAt && dayjs(billing.trialEndsAt).isBefore(dayjs());
  return (
    <Card withBorder radius="lg">
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <div style={{ minWidth: 0 }}>
            <Text size="xs" c="dimmed">
              {t('plan')}
            </Text>
            <Title order={3} size="h4">
              {billing.plan.name}
            </Title>
            <Text size="sm">
              {billing.plan.priceArs !== null
                ? t('perMonth', { price: money(billing.plan.priceArs, 'ARS', { whole: true }) })
                : t('noPrice')}
            </Text>
          </div>
          <Badge variant="light" color={ACCOUNT_STATUS_COLORS[billing.status]} style={{ flexShrink: 0 }}>
            {t(`accountStatus.${billing.status}`)}
          </Badge>
        </Group>
        <Divider />
        {billing.status === 'trial' && billing.trialEndsAt && (
          <Text size="sm">
            {expiredTrial
              ? t('trialEnded', { date: day(billing.trialEndsAt) })
              : t('trialUntil', { date: day(billing.trialEndsAt) })}
          </Text>
        )}
        {billing.paidUntil && (
          <Text size="sm">
            {dayjs(billing.paidUntil).isBefore(dayjs())
              ? t('paidUntilPast', { date: day(billing.paidUntil) })
              : t('paidUntil', { date: day(billing.paidUntil) })}
          </Text>
        )}
        {(billing.status === 'past_due' || expiredTrial) && (
          <Text size="sm" c="yellow.7">
            {t('readOnly')}
          </Text>
        )}
      </Stack>
    </Card>
  );
}

/** Pagos registrados (cobros del débito y pagos a mano), del más nuevo al más viejo. */
export function InvoiceList({ billing }: { billing: BillingOverview }) {
  const { t } = useTranslation('billing');
  const money = useMoney();
  return (
    <Card withBorder radius="lg">
      <Title order={3} size="h5" mb="sm">
        {t('invoices.title')}
      </Title>
      {billing.invoices.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t('invoices.empty')}
        </Text>
      ) : (
        <Stack gap="sm">
          {billing.invoices.map((i, index) => (
            <Fragment key={i.id}>
              {index > 0 && <Divider />}
              <Group justify="space-between" wrap="nowrap" gap="xs" align="flex-start">
                <div style={{ minWidth: 0 }}>
                  <Text size="sm" fw={500}>
                    {money(i.amount, i.currency)}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {day(i.paidAt ?? i.createdAt)} · {t(`invoices.provider.${i.provider}`)}
                    {i.periodStart && i.periodEnd
                      ? ` · ${t('invoices.period', { from: day(i.periodStart), to: day(i.periodEnd) })}`
                      : ''}
                  </Text>
                  {i.note && (
                    <Text size="xs" c="dimmed">
                      {i.note}
                    </Text>
                  )}
                </div>
                <Badge variant="light" color={INVOICE_COLORS[i.status]} style={{ flexShrink: 0 }}>
                  {t(`invoices.status.${i.status}`)}
                </Badge>
              </Group>
            </Fragment>
          ))}
        </Stack>
      )}
    </Card>
  );
}
