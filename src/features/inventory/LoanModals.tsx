import {
  Badge,
  type BadgeProps,
  Button,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconSearch } from '@tabler/icons-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  inventoryApi,
  ITEM_STATUSES,
  loansApi,
  type Borrower,
  type InventoryListItem,
  type ItemStatus,
  type Loan,
} from '../../api/inventory';
import { FormError } from '../../components/FormError';
import { ResponsiveModal } from '../../components/ResponsiveModal';
import { formatDate, fullName, todayIso } from '../people/format';

const orNull = (v: string) => (v.trim() === '' ? null : v.trim());

/** Insignia "Prestado" / "Vencido" para la lista de equipos y la ficha. */
export function LoanBadge({ loan, ...props }: { loan: { overdue: boolean } } & BadgeProps) {
  const { t } = useTranslation('inventory');
  return (
    <Badge color={loan.overdue ? 'red' : 'marfil'} variant="light" {...props}>
      {loan.overdue ? t('loans.overdueBadge') : t('loans.onLoan')}
    </Badge>
  );
}

function useServerSearch<T>(key: string, fn: (q: string) => Promise<{ items: T[] }>) {
  const [search, setSearch] = useState('');
  const [debounced] = useDebouncedValue(search, 300);
  const results = useQuery({
    queryKey: ['inventory', key, debounced],
    queryFn: () => fn(debounced),
    enabled: debounced.trim().length >= 2,
    placeholderData: keepPreviousData,
  });
  return { search, setSearch, items: results.data?.items ?? [] };
}

/** Persona a quien se presta (búsqueda propia del inventario: no requiere ver personas). */
function BorrowerSelect({
  value,
  onChange,
}: {
  value: Borrower | null;
  onChange: (b: Borrower | null) => void;
}) {
  const { t } = useTranslation('inventory');
  const { search, setSearch, items } = useServerSearch('borrowers', (q) => loansApi.borrowers(q));
  const all = value && !items.some((p) => p.id === value.id) ? [value, ...items] : items;
  const byId = new Map(all.map((p) => [String(p.id), p]));
  return (
    <Select
      label={t('loans.borrower')}
      placeholder={t('loans.borrowerPlaceholder')}
      required
      searchable
      clearable
      allowDeselect={false}
      leftSection={<IconSearch size={16} />}
      filter={({ options }) => options}
      data={all.map((p) => ({ value: String(p.id), label: fullName(p) }))}
      value={value ? String(value.id) : null}
      onChange={(id) => onChange(id ? (byId.get(id) ?? null) : null)}
      searchValue={search}
      onSearchChange={setSearch}
      renderOption={({ option }) => {
        const p = byId.get(option.value);
        return (
          <Group gap={6} wrap="nowrap">
            <Text size="sm">{option.label}</Text>
            {p?.phone && (
              <Text size="xs" c="dimmed">
                {p.phone}
              </Text>
            )}
          </Group>
        );
      }}
      comboboxProps={{ withinPortal: true }}
    />
  );
}

/** Equipos que se pueden prestar: no prestados, ni en reparación ni de baja. */
function ItemSelect({
  value,
  onChange,
}: {
  value: InventoryListItem | null;
  onChange: (i: InventoryListItem | null) => void;
}) {
  const { t } = useTranslation('inventory');
  const { search, setSearch, items } = useServerSearch('loanable', (q) =>
    inventoryApi.list({ q, pageSize: 30 }),
  );
  const loanable = items.filter((i) => !i.loan && i.status !== 'repair' && i.status !== 'retired');
  const all = value && !loanable.some((i) => i.id === value.id) ? [value, ...loanable] : loanable;
  const byId = new Map(all.map((i) => [String(i.id), i]));
  return (
    <Select
      label={t('loans.item')}
      placeholder={t('loans.itemPlaceholder')}
      required
      searchable
      clearable
      allowDeselect={false}
      leftSection={<IconSearch size={16} />}
      filter={({ options }) => options}
      data={all.map((i) => ({ value: String(i.id), label: `${i.name} · ${i.code}` }))}
      value={value ? String(value.id) : null}
      onChange={(id) => onChange(id ? (byId.get(id) ?? null) : null)}
      searchValue={search}
      onSearchChange={setSearch}
      comboboxProps={{ withinPortal: true }}
    />
  );
}

function NewLoanForm({
  item: fixedItem,
  onClose,
  onSaved,
}: {
  item: { id: number; name: string; code: string } | null;
  onClose: () => void;
  onSaved: (loan: Loan) => void;
}) {
  const { t } = useTranslation(['inventory', 'common']);
  const [item, setItem] = useState<InventoryListItem | null>(null);
  const [borrower, setBorrower] = useState<Borrower | null>(null);
  const [borrowedAt, setBorrowedAt] = useState(todayIso());
  const [dueAt, setDueAt] = useState(dayjs().add(7, 'day').format('YYYY-MM-DD'));
  const [conditionOut, setConditionOut] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const itemId = fixedItem?.id ?? item?.id;
  const valid = !!itemId && !!borrower && borrowedAt !== '' && dueAt !== '' && dueAt >= borrowedAt;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        setBusy(true);
        setError(null);
        try {
          onSaved(
            await loansApi.create({
              itemId: itemId!,
              borrowerPersonId: borrower!.id,
              borrowedAt,
              dueAt,
              conditionOut: orNull(conditionOut),
              notes: orNull(notes),
            }),
          );
        } catch (err) {
          setError(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Stack>
        <FormError error={error} />
        {fixedItem ? (
          <TextInput label={t('loans.item')} value={`${fixedItem.name} · ${fixedItem.code}`} readOnly />
        ) : (
          <ItemSelect value={item} onChange={setItem} />
        )}
        <BorrowerSelect value={borrower} onChange={setBorrower} />
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
          <TextInput
            type="date"
            label={t('loans.borrowedAt')}
            value={borrowedAt}
            max={todayIso()}
            onChange={(e) => setBorrowedAt(e.currentTarget.value)}
            required
          />
          <TextInput
            type="date"
            label={t('loans.dueAt')}
            value={dueAt}
            min={borrowedAt}
            onChange={(e) => setDueAt(e.currentTarget.value)}
            required
          />
        </SimpleGrid>
        <TextInput
          label={t('loans.conditionOut')}
          placeholder={t('loans.conditionOutPlaceholder')}
          value={conditionOut}
          onChange={(e) => setConditionOut(e.currentTarget.value)}
          maxLength={200}
        />
        <Textarea
          label={t('loans.notes')}
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
          maxLength={500}
          autosize
          minRows={2}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={busy} disabled={!valid}>
            {t('loans.lend')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

/** Nuevo préstamo; con `item`, del equipo de esa ficha. */
export function NewLoanModal({
  opened,
  item,
  onClose,
  onSaved,
}: {
  opened: boolean;
  item: { id: number; name: string; code: string } | null;
  onClose: () => void;
  onSaved: (loan: Loan) => void;
}) {
  const { t } = useTranslation('inventory');
  return (
    <ResponsiveModal opened={opened} onClose={onClose} title={t('loans.new')}>
      {opened && <NewLoanForm item={item} onClose={onClose} onSaved={onSaved} />}
    </ResponsiveModal>
  );
}

type ReturnStatus = Exclude<ItemStatus, 'retired'>;

function ReturnForm({
  loan,
  onClose,
  onSaved,
}: {
  loan: Loan;
  onClose: () => void;
  onSaved: (l: Loan) => void;
}) {
  const { t } = useTranslation(['inventory', 'common']);
  const [conditionIn, setConditionIn] = useState('');
  const current = loan.item.status === 'retired' ? 'ok' : loan.item.status;
  const [status, setStatus] = useState<ReturnStatus>(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          onSaved(
            await loansApi.giveBack(loan.id, {
              conditionIn: orNull(conditionIn),
              ...(status !== loan.item.status ? { status } : {}),
            }),
          );
        } catch (err) {
          setError(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Stack>
        <FormError error={error} />
        <Text size="sm">
          {fullName(loan.borrower)} ·{' '}
          {t('loans.period', { from: formatDate(loan.borrowedAt), to: formatDate(loan.dueAt) })}
        </Text>
        {loan.conditionOut && (
          <Text size="sm" c="dimmed">
            {t('loans.conditionOut')}: {loan.conditionOut}
          </Text>
        )}
        <TextInput
          label={t('loans.conditionIn')}
          value={conditionIn}
          onChange={(e) => setConditionIn(e.currentTarget.value)}
          maxLength={200}
          data-autofocus
        />
        {!loan.item.deleted && (
          <Select
            label={t('loans.statusAfter')}
            description={t('loans.statusAfterHint')}
            data={ITEM_STATUSES.filter((s) => s !== 'retired').map((s) => ({
              value: s,
              label: t(`status.${s}`),
            }))}
            value={status}
            onChange={(v) => v && setStatus(v as ReturnStatus)}
            allowDeselect={false}
          />
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={busy}>
            {t('loans.giveBack')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function ReturnLoanModal({
  loan,
  onClose,
  onSaved,
}: {
  loan: Loan | null;
  onClose: () => void;
  onSaved: (l: Loan) => void;
}) {
  const { t } = useTranslation('inventory');
  return (
    <ResponsiveModal
      opened={loan !== null}
      onClose={onClose}
      size="md"
      title={loan ? t('loans.returnTitle', { name: loan.item.name }) : ''}
    >
      {loan && <ReturnForm loan={loan} onClose={onClose} onSaved={onSaved} />}
    </ResponsiveModal>
  );
}

function ExtendForm({
  loan,
  onClose,
  onSaved,
}: {
  loan: Loan;
  onClose: () => void;
  onSaved: (l: Loan) => void;
}) {
  const { t } = useTranslation(['inventory', 'common']);
  const [dueAt, setDueAt] = useState(loan.dueAt);
  const [notes, setNotes] = useState(loan.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const valid = dueAt !== '' && dueAt >= loan.borrowedAt;
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        setBusy(true);
        setError(null);
        try {
          onSaved(await loansApi.update(loan.id, { dueAt, notes: orNull(notes) }));
        } catch (err) {
          setError(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Stack>
        <FormError error={error} />
        <TextInput
          type="date"
          label={t('loans.dueAt')}
          value={dueAt}
          min={loan.borrowedAt}
          onChange={(e) => setDueAt(e.currentTarget.value)}
          required
          data-autofocus
        />
        <Textarea
          label={t('loans.notes')}
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
          maxLength={500}
          autosize
          minRows={2}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={busy} disabled={!valid}>
            {t('common:actions.save')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function ExtendLoanModal({
  loan,
  onClose,
  onSaved,
}: {
  loan: Loan | null;
  onClose: () => void;
  onSaved: (l: Loan) => void;
}) {
  const { t } = useTranslation('inventory');
  return (
    <ResponsiveModal opened={loan !== null} onClose={onClose} size="md" title={t('loans.extend')}>
      {loan && <ExtendForm loan={loan} onClose={onClose} onSaved={onSaved} />}
    </ResponsiveModal>
  );
}
