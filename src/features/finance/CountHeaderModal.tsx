import { Button, Group, Select, SimpleGrid, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { financeApi, type OfferingCountDetail } from '../../api/finance';
import { FormError } from '../../components/FormError';
import { ResponsiveModal } from '../../components/ResponsiveModal';
import { todayIso } from '../people/format';
import { PersonPicker, type PersonOption } from '../people/PersonPicker';
import { accountsQuery } from './common';
import { readLastAccount, rememberAccount } from './money-input';

const orNull = (v: string) => (v.trim() === '' ? null : v.trim());

function CountHeaderForm({
  count,
  onClose,
  onSaved,
}: {
  count: OfferingCountDetail | null;
  onClose: () => void;
  onSaved: (c: OfferingCountDetail) => void;
}) {
  const { t } = useTranslation(['finance', 'common']);
  const accounts = useQuery(accountsQuery());
  const [date, setDate] = useState(count?.date ?? todayIso());
  const [title, setTitle] = useState(count?.title ?? '');
  const [accountId, setAccountId] = useState<string | null>(
    count ? String(count.financeAccount.id) : readLastAccount(),
  );
  const [counter1, setCounter1] = useState<PersonOption | null>(
    count ? { ...count.counter1, phone: null } : null,
  );
  const [counter2, setCounter2] = useState<PersonOption | null>(
    count ? { ...count.counter2, phone: null } : null,
  );
  const [notes, setNotes] = useState(count?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const options = (accounts.data ?? []).filter((a) => a.isActive);
  // Por defecto la última caja usada; si no, la primera de efectivo.
  const selected =
    options.find((a) => String(a.id) === accountId) ?? options.find((a) => a.type === 'cash') ?? options[0];
  const same = counter1 && counter2 && counter1.id === counter2.id;
  const valid = Boolean(date && selected && counter1 && counter2 && !same);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid || !selected || !counter1 || !counter2) return;
        setBusy(true);
        setError(null);
        try {
          const body = {
            date,
            title: orNull(title),
            financeAccountId: selected.id,
            counter1PersonId: counter1.id,
            counter2PersonId: counter2.id,
            notes: orNull(notes),
          };
          const saved = count
            ? await financeApi.updateCount(count.id, body)
            : await financeApi.createCount({ ...body, lines: [] });
          rememberAccount(selected.id);
          onSaved(saved);
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
          label={t('counts.titleField')}
          placeholder={t('counts.titleHint')}
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          maxLength={100}
          data-autofocus
        />
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
            label={t('movement.account')}
            data={options.map((a) => ({ value: String(a.id), label: `${a.name} (${a.currency})` }))}
            value={selected ? String(selected.id) : null}
            onChange={setAccountId}
            allowDeselect={false}
            required
          />
        </SimpleGrid>
        <Text size="sm" c="dimmed">
          {t('counts.countersHint')}
        </Text>
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
          <PersonPicker
            label={t('counts.counter1')}
            value={counter1}
            onChange={setCounter1}
            exclude={counter2 ? [counter2.id] : []}
            required
          />
          <PersonPicker
            label={t('counts.counter2')}
            value={counter2}
            onChange={setCounter2}
            exclude={counter1 ? [counter1.id] : []}
            required
          />
        </SimpleGrid>
        <Textarea
          label={t('counts.notes')}
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
            {count ? t('common:actions.save') : t('counts.start')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

/** Datos generales del arqueo: fecha, caja, título y los dos contadores. */
export function CountHeaderModal({
  opened,
  count = null,
  onClose,
  onSaved,
}: {
  opened: boolean;
  count?: OfferingCountDetail | null;
  onClose: () => void;
  onSaved: (c: OfferingCountDetail) => void;
}) {
  const { t } = useTranslation('finance');
  return (
    <ResponsiveModal
      opened={opened}
      onClose={onClose}
      title={count ? t('counts.editHeader') : t('counts.new')}
      size="md"
    >
      {opened && <CountHeaderForm count={count} onClose={onClose} onSaved={onSaved} />}
    </ResponsiveModal>
  );
}
