import {
  Button,
  Card,
  Group,
  Loader,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCash } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { billingApi } from '../../api/billing';
import { FormError } from '../../components/FormError';
import { ResponsiveModal } from '../../components/ResponsiveModal';
import { todayIso } from '../people/format';
import { InvoiceList } from './BillingParts';

function ManualPaymentForm({
  accountId,
  onClose,
  onSaved,
}: {
  accountId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation(['billing', 'common']);
  const [amount, setAmount] = useState<number | ''>('');
  const [currency, setCurrency] = useState<string>('ARS');
  const [months, setMonths] = useState<number | ''>(1);
  const [paidAt, setPaidAt] = useState(todayIso());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const valid = amount !== '' && months !== '' && paidAt !== '';

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        setBusy(true);
        setError(null);
        try {
          await billingApi.manualPayment(accountId, {
            amount: Number(amount),
            currency,
            months: Number(months),
            // Mediodía local: el día elegido no cambia al pasar a UTC.
            paidAt: dayjs(`${paidAt}T12:00`).toISOString(),
            note: note.trim() || undefined,
          });
          onSaved();
        } catch (err) {
          setError(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Stack>
        <FormError error={error} />
        <Text size="sm" c="dimmed">
          {t('manual.hint')}
        </Text>
        <Group grow align="flex-start">
          <NumberInput
            label={t('manual.amount')}
            value={amount}
            onChange={(v) => setAmount(typeof v === 'number' ? v : '')}
            min={0}
            decimalScale={2}
            thousandSeparator="."
            decimalSeparator=","
            required
            data-autofocus
          />
          <Select
            label={t('manual.currency')}
            data={['ARS', 'USD']}
            value={currency}
            onChange={(v) => setCurrency(v ?? 'ARS')}
            allowDeselect={false}
          />
        </Group>
        <Group grow align="flex-start">
          <NumberInput
            label={t('manual.months')}
            value={months}
            onChange={(v) => setMonths(typeof v === 'number' ? v : '')}
            min={1}
            max={24}
            allowDecimal={false}
            required
          />
          <TextInput
            type="date"
            label={t('manual.paidAt')}
            value={paidAt}
            onChange={(e) => setPaidAt(e.currentTarget.value)}
            required
          />
        </Group>
        <TextInput
          label={t('manual.note')}
          placeholder={t('manual.notePlaceholder')}
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
          maxLength={300}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={busy} disabled={!valid}>
            {t('manual.save')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

/** Facturación de una iglesia en el panel de plataforma: pagado hasta, débito y pagos. */
export function PlatformBilling({ accountId }: { accountId: number }) {
  const { t } = useTranslation('billing');
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const billing = useQuery({
    queryKey: ['platform', 'billing', accountId],
    queryFn: () => billingApi.platformOverview(accountId),
  });

  return (
    <Stack gap="lg">
      <Card withBorder radius="lg" padding="lg">
        <Group justify="space-between" mb="md">
          <Title order={2} size="h4">
            {t('title')}
          </Title>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconCash size={16} />}
            onClick={() => setOpen(true)}
          >
            {t('manual.button')}
          </Button>
        </Group>
        {billing.isPending ? (
          <Loader size="sm" />
        ) : billing.isError ? (
          <FormError error={billing.error} />
        ) : (
          <Stack gap={4}>
            <Text size="sm">
              {billing.data.paidUntil
                ? t('paidUntil', { date: dayjs(billing.data.paidUntil).format('L') })
                : t('neverPaid')}
            </Text>
            <Text size="sm" c="dimmed">
              {billing.data.subscription
                ? t('platformSub', {
                    status: t(`subscriptionStatus.${billing.data.subscription.status}`),
                    provider: t(`invoices.provider.${billing.data.subscription.provider}`),
                  })
                : t('auto.none')}
            </Text>
          </Stack>
        )}
      </Card>
      {billing.data && <InvoiceList billing={billing.data} />}
      <ResponsiveModal opened={open} onClose={() => setOpen(false)} size="md" title={t('manual.title')}>
        {open && (
          <ManualPaymentForm
            accountId={accountId}
            onClose={() => setOpen(false)}
            onSaved={async () => {
              setOpen(false);
              notifications.show({ color: 'teal', message: t('manual.saved') });
              await queryClient.invalidateQueries({ queryKey: ['platform'] });
            }}
          />
        )}
      </ResponsiveModal>
    </Stack>
  );
}
