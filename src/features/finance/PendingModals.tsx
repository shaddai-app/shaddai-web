import { Alert, Button, Group, NumberInput, Select, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  financeApi,
  PAYMENT_METHODS,
  type Movement,
  type MovementDetail,
  type PaymentMethod,
} from '../../api/finance';
import { FormError } from '../../components/FormError';
import { ResponsiveModal } from '../../components/ResponsiveModal';
import { formatDate, todayIso } from '../people/format';
import {
  accountsQuery,
  categoriesQuery,
  dayAfter,
  useCategoryLabel,
  useChurchCurrency,
  useClosedUntil,
  useMoney,
} from './common';
import { currencySymbol, readLastAccount, rememberAccount, useSeparators } from './money-input';

function ConfirmPendingForm({
  movement,
  onClose,
  onDone,
}: {
  movement: Movement;
  onClose: () => void;
  onDone: (m: MovementDetail) => void;
}) {
  const { t, i18n } = useTranslation(['finance', 'common']);
  const closedUntil = useClosedUntil();
  const money = useMoney();
  const separators = useSeparators();
  const categoryLabel = useCategoryLabel();
  const currency = useChurchCurrency();
  const accounts = useQuery(accountsQuery());
  const categories = useQuery(categoriesQuery('income'));
  // El líder informó en la moneda de la iglesia: solo cajas en esa moneda.
  const options = (accounts.data ?? []).filter((a) => a.currency === currency);
  const [accountId, setAccountId] = useState<string | null>(readLastAccount());
  const selected = options.find((a) => String(a.id) === accountId) ?? options[0];
  const [amount, setAmount] = useState<number | ''>(movement.amount);
  const [date, setDate] = useState(movement.date);
  const [categoryId, setCategoryId] = useState<string | null>(
    movement.category ? String(movement.category.id) : null,
  );
  const [method, setMethod] = useState<PaymentMethod>(movement.paymentMethod ?? 'cash');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const difference = amount === '' ? 0 : Math.round((Number(amount) - movement.amount) * 100) / 100;
  const valid = Boolean(selected && amount && Number(amount) > 0 && date && categoryId);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid || !selected) return;
        setBusy(true);
        setError(null);
        try {
          const saved = await financeApi.confirmPending(movement.id, {
            financeAccountId: selected.id,
            categoryId: Number(categoryId),
            date,
            amount: Number(amount),
            paymentMethod: method,
          });
          rememberAccount(selected.id);
          onDone(saved);
        } catch (err) {
          setError(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Stack>
        <FormError error={error} />
        {movement.cellReport && (
          <Text size="sm">
            {t('pending.informed', {
              cell: movement.cellReport.cell.name,
              date: formatDate(movement.cellReport.meetingDate),
              amount: money(movement.amount, currency),
            })}
          </Text>
        )}
        <NumberInput
          label={t('pending.received')}
          size="lg"
          value={amount}
          onChange={(v) => setAmount(v === '' ? '' : Number(v))}
          prefix={`${currencySymbol(currency, i18n.resolvedLanguage ?? 'es')} `}
          decimalScale={2}
          allowNegative={false}
          inputMode="decimal"
          required
          data-autofocus
          {...separators}
        />
        {difference !== 0 && (
          <Alert color="yellow" variant="light" p="xs">
            {t('pending.difference', { amount: money(difference, currency, { signed: true }) })}
          </Alert>
        )}
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
          <Select
            label={t('movement.account')}
            data={options.map((a) => ({ value: String(a.id), label: a.name }))}
            value={selected ? String(selected.id) : null}
            onChange={setAccountId}
            allowDeselect={false}
            nothingFoundMessage={t('pending.noAccounts', { currency })}
            required
          />
          <Select
            label={t('movement.category')}
            data={(categories.data ?? []).map((c) => ({ value: String(c.id), label: categoryLabel(c) }))}
            value={categoryId}
            onChange={setCategoryId}
            required
          />
          <TextInput
            type="date"
            label={t('movement.date')}
            value={date}
            min={dayAfter(closedUntil)}
            max={todayIso()}
            onChange={(e) => setDate(e.currentTarget.value)}
            required
          />
          <Select
            label={t('movement.method')}
            data={PAYMENT_METHODS.map((m) => ({ value: m, label: t(`methods.${m}`) }))}
            value={method}
            onChange={(v) => v && setMethod(v as PaymentMethod)}
            allowDeselect={false}
          />
        </SimpleGrid>
        {accounts.data && options.length === 0 && (
          <Text size="sm" c="red">
            {t('pending.noAccounts', { currency })}
          </Text>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" color="teal" loading={busy} disabled={!valid}>
            {t('pending.confirm')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

/** Tesorería confirma una ofrenda de célula: elige la caja y registra lo que realmente llegó. */
export function ConfirmPendingModal({
  movement,
  onClose,
  onDone,
}: {
  movement: Movement | null;
  onClose: () => void;
  onDone: (m: MovementDetail) => void;
}) {
  const { t } = useTranslation('finance');
  return (
    <ResponsiveModal opened={movement !== null} onClose={onClose} title={t('pending.confirmTitle')} size="md">
      {movement && <ConfirmPendingForm movement={movement} onClose={onClose} onDone={onDone} />}
    </ResponsiveModal>
  );
}
