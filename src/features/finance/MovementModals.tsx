import {
  Button,
  FileInput,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { IconPaperclip } from '@tabler/icons-react';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  financeApi,
  PAYMENT_METHODS,
  type CategoryKind,
  type MovementDetail,
  type PaymentMethod,
} from '../../api/finance';
import { can } from '../../auth/permissions';
import { meQuery } from '../../auth/session';
import { FormError } from '../../components/FormError';
import { ResponsiveModal } from '../../components/ResponsiveModal';
import { todayIso } from '../people/format';
import { PersonPicker, type PersonOption } from '../people/PersonPicker';
import { accountsQuery, categoriesQuery, useCategoryLabel } from './common';

const LAST_ACCOUNT_KEY = 'shaddai-last-finance-account';
const readLastAccount = () => {
  try {
    return localStorage.getItem(LAST_ACCOUNT_KEY);
  } catch {
    return null;
  }
};
const orNull = (v: string) => (v.trim() === '' ? null : v.trim());

/** Separadores del NumberInput según el idioma (1.234,50 / 1,234.50). */
function useSeparators() {
  const { i18n } = useTranslation();
  return i18n.resolvedLanguage === 'en'
    ? { decimalSeparator: '.', thousandSeparator: ',' }
    : { decimalSeparator: ',', thousandSeparator: '.' };
}

function currencySymbol(currency: string | undefined, lang: string) {
  if (!currency) return '';
  const locale = lang === 'es' ? 'es-AR' : lang;
  return (
    new Intl.NumberFormat(locale, { style: 'currency', currency })
      .formatToParts(0)
      .find((p) => p.type === 'currency')?.value ?? currency
  );
}

function MovementForm({
  kind: initialKind,
  movement,
  onClose,
  onSaved,
}: {
  kind: CategoryKind;
  movement: MovementDetail | null;
  onClose: () => void;
  onSaved: (m: MovementDetail) => void;
}) {
  const { t, i18n } = useTranslation(['finance', 'common']);
  const { data: me } = useSuspenseQuery(meQuery());
  const categoryLabel = useCategoryLabel();
  const separators = useSeparators();
  const accounts = useQuery(accountsQuery());
  const editing = Boolean(movement);
  const [kind, setKind] = useState<CategoryKind>(
    movement?.kind === 'expense' || movement?.kind === 'income' ? movement.kind : initialKind,
  );
  const categories = useQuery(categoriesQuery(kind));
  const [amount, setAmount] = useState<number | ''>(movement?.amount ?? '');
  const [accountId, setAccountId] = useState<string | null>(
    movement ? String(movement.financeAccount.id) : readLastAccount(),
  );
  const [categoryId, setCategoryId] = useState<string | null>(
    movement?.category ? String(movement.category.id) : null,
  );
  const [date, setDate] = useState(movement?.date ?? todayIso());
  const [method, setMethod] = useState<PaymentMethod | null>(movement?.paymentMethod ?? 'cash');
  const [person, setPerson] = useState<PersonOption | null>(
    movement?.person ? { ...movement.person, phone: null } : null,
  );
  const [description, setDescription] = useState(movement?.description ?? '');
  const [reference, setReference] = useState(movement?.reference ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const canContributors = can(me, 'finanzas.diezmos_nominales');

  const activeAccounts = (accounts.data ?? []).filter((a) => a.isActive || String(a.id) === accountId);
  // Si la última caja usada ya no existe, se toma la primera.
  const selectedAccount =
    activeAccounts.find((a) => String(a.id) === accountId) ?? (editing ? undefined : activeAccounts[0]);
  const valid = Boolean(amount && Number(amount) > 0 && selectedAccount && categoryId && date);

  const submit = async () => {
    if (!selectedAccount || !categoryId || !amount) return;
    setBusy(true);
    setError(null);
    try {
      const body = {
        financeAccountId: selectedAccount.id,
        categoryId: Number(categoryId),
        date,
        amount: Number(amount),
        description: orNull(description),
        reference: orNull(reference),
        paymentMethod: method,
        ...(canContributors ? { personId: kind === 'income' ? (person?.id ?? null) : null } : {}),
      };
      let saved = movement
        ? await financeApi.updateMovement(movement.id, body)
        : await financeApi.createMovement({ kind, ...body });
      if (file) saved = await financeApi.attach(saved.id, file);
      try {
        localStorage.setItem(LAST_ACCOUNT_KEY, String(selectedAccount.id));
      } catch {
        // sin almacenamiento local no pasa nada
      }
      onSaved(saved);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) void submit();
      }}
    >
      <Stack>
        <FormError error={error} />
        {!editing && (
          <SegmentedControl
            fullWidth
            value={kind}
            color={kind === 'income' ? 'teal' : 'red'}
            onChange={(v) => {
              setKind(v as CategoryKind);
              setCategoryId(null);
            }}
            data={[
              { value: 'income', label: t('kinds.income') },
              { value: 'expense', label: t('kinds.expense') },
            ]}
          />
        )}
        <NumberInput
          label={t('movement.amount')}
          size="lg"
          value={amount}
          onChange={(v) => setAmount(v === '' ? '' : Number(v))}
          prefix={`${currencySymbol(selectedAccount?.currency, i18n.resolvedLanguage ?? 'es')} `}
          decimalScale={2}
          allowNegative={false}
          inputMode="decimal"
          required
          data-autofocus
          {...separators}
        />
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
          <Select
            label={t('movement.account')}
            data={activeAccounts.map((a) => ({ value: String(a.id), label: `${a.name} (${a.currency})` }))}
            value={selectedAccount ? String(selectedAccount.id) : null}
            onChange={setAccountId}
            allowDeselect={false}
            required
          />
          <Select
            label={t('movement.category')}
            data={(categories.data ?? [])
              .filter((c) => c.isActive || String(c.id) === categoryId)
              .map((c) => ({ value: String(c.id), label: categoryLabel(c) }))}
            value={categoryId}
            onChange={setCategoryId}
            searchable
            required
          />
        </SimpleGrid>
        <SimpleGrid cols={2} spacing="sm">
          <TextInput
            type="date"
            label={t('movement.date')}
            value={date}
            max={todayIso()}
            onChange={(e) => setDate(e.currentTarget.value)}
            required
          />
          <Select
            label={t('movement.method')}
            data={PAYMENT_METHODS.map((m) => ({ value: m, label: t(`methods.${m}`) }))}
            value={method}
            onChange={(v) => setMethod(v as PaymentMethod | null)}
            clearable
          />
        </SimpleGrid>
        {canContributors && kind === 'income' && (
          <PersonPicker
            label={t('movement.contributor')}
            description={t('movement.contributorHint')}
            placeholder={t('movement.anonymous')}
            value={person}
            onChange={setPerson}
          />
        )}
        <TextInput
          label={t('movement.description')}
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          maxLength={300}
        />
        <TextInput
          label={t('movement.reference')}
          placeholder={t('movement.referenceHint')}
          value={reference}
          onChange={(e) => setReference(e.currentTarget.value)}
          maxLength={100}
        />
        {!editing && (
          <FileInput
            label={t('movement.receipt')}
            placeholder={t('movement.receiptHint')}
            accept="image/*,application/pdf"
            leftSection={<IconPaperclip size={16} />}
            value={file}
            onChange={setFile}
            clearable
          />
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={busy} disabled={!valid} color={kind === 'income' ? 'teal' : 'red'}>
            {editing ? t('common:actions.save') : t(`movement.save.${kind}`)}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function MovementModal({
  opened,
  kind,
  movement = null,
  onClose,
  onSaved,
}: {
  opened: boolean;
  kind: CategoryKind;
  movement?: MovementDetail | null;
  onClose: () => void;
  onSaved: (m: MovementDetail) => void;
}) {
  const { t } = useTranslation('finance');
  return (
    <ResponsiveModal
      opened={opened}
      onClose={onClose}
      title={movement ? t('movement.editTitle') : t('movement.newTitle')}
      size="md"
    >
      {opened && <MovementForm kind={kind} movement={movement} onClose={onClose} onSaved={onSaved} />}
    </ResponsiveModal>
  );
}

function TransferForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation(['finance', 'common']);
  const separators = useSeparators();
  const accounts = useQuery(accountsQuery());
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState(todayIso());
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const list = accounts.data ?? [];
  const source = list.find((a) => String(a.id) === from);
  // Solo entre cajas de la misma moneda (no hay conversión).
  const targets = list.filter((a) => source && a.id !== source.id && a.currency === source.currency);
  const valid = Boolean(source && to && amount && Number(amount) > 0 && date);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        setBusy(true);
        setError(null);
        try {
          await financeApi.transfer({
            fromAccountId: Number(from),
            toAccountId: Number(to),
            amount: Number(amount),
            date,
            description: orNull(description),
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
        <Select
          label={t('transfer.from')}
          data={list.map((a) => ({ value: String(a.id), label: `${a.name} (${a.currency})` }))}
          value={from}
          onChange={(v) => {
            setFrom(v);
            setTo(null);
          }}
          required
          data-autofocus
        />
        <Select
          label={t('transfer.to')}
          data={targets.map((a) => ({ value: String(a.id), label: `${a.name} (${a.currency})` }))}
          value={to}
          onChange={setTo}
          disabled={!source}
          nothingFoundMessage={t('transfer.noTargets')}
          required
        />
        {source && targets.length === 0 && (
          <Text size="xs" c="dimmed">
            {t('transfer.noTargets')}
          </Text>
        )}
        <SimpleGrid cols={2} spacing="sm">
          <NumberInput
            label={t('movement.amount')}
            value={amount}
            onChange={(v) => setAmount(v === '' ? '' : Number(v))}
            decimalScale={2}
            allowNegative={false}
            inputMode="decimal"
            required
            {...separators}
          />
          <TextInput
            type="date"
            label={t('movement.date')}
            value={date}
            max={todayIso()}
            onChange={(e) => setDate(e.currentTarget.value)}
            required
          />
        </SimpleGrid>
        <TextInput
          label={t('movement.description')}
          placeholder={t('transfer.descriptionHint')}
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          maxLength={300}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={busy} disabled={!valid}>
            {t('transfer.save')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function TransferModal({
  opened,
  onClose,
  onSaved,
}: {
  opened: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation('finance');
  return (
    <ResponsiveModal opened={opened} onClose={onClose} title={t('transfer.title')} size="md">
      {opened && <TransferForm onClose={onClose} onSaved={onSaved} />}
    </ResponsiveModal>
  );
}

export function VoidModal({
  opened,
  onClose,
  onConfirm,
}: {
  opened: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const { t } = useTranslation(['finance', 'common']);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <ResponsiveModal opened={opened} onClose={onClose} title={t('void.title')} size="md">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await onConfirm(reason.trim());
            setReason('');
          } finally {
            setBusy(false);
          }
        }}
      >
        <Stack>
          <Text size="sm">{t('void.body')}</Text>
          <Textarea
            label={t('void.reason')}
            value={reason}
            onChange={(e) => setReason(e.currentTarget.value)}
            maxLength={300}
            autosize
            minRows={2}
            required
            data-autofocus
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" color="red" loading={busy} disabled={!reason.trim()}>
              {t('void.confirm')}
            </Button>
          </Group>
        </Stack>
      </form>
    </ResponsiveModal>
  );
}
