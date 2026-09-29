import { Button, Group, NumberInput, Select, SimpleGrid, Stack, Textarea, TextInput } from '@mantine/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  inventoryApi,
  ITEM_STATUSES,
  MAINTENANCE_TYPES,
  type InventoryItem,
  type ItemStatus,
  type MaintenanceType,
} from '../../api/inventory';
import { FormError } from '../../components/FormError';
import { ResponsiveModal } from '../../components/ResponsiveModal';
import { useChurchCurrency } from '../finance/common';
import { currencySymbol, useSeparators } from '../finance/money-input';
import { todayIso } from '../people/format';

function MaintenanceForm({
  item,
  onClose,
  onSaved,
}: {
  item: InventoryItem;
  onClose: () => void;
  onSaved: (i: InventoryItem) => void;
}) {
  const { t, i18n } = useTranslation(['inventory', 'common']);
  const separators = useSeparators();
  const currency = useChurchCurrency();
  const [date, setDate] = useState(todayIso());
  const [type, setType] = useState<MaintenanceType>(item.status === 'ok' ? 'preventive' : 'repair');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState<number | ''>('');
  const [vendor, setVendor] = useState('');
  const [status, setStatus] = useState<ItemStatus>(item.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const valid = date !== '' && description.trim() !== '';

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        setBusy(true);
        setError(null);
        try {
          onSaved(
            await inventoryApi.addMaintenance(item.id, {
              date,
              type,
              description: description.trim(),
              cost: cost === '' ? null : cost,
              vendor: vendor.trim() || null,
              ...(status !== item.status ? { status } : {}),
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
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
          <TextInput
            type="date"
            label={t('maintenance.date')}
            value={date}
            max={todayIso()}
            onChange={(e) => setDate(e.currentTarget.value)}
            required
          />
          <Select
            label={t('maintenance.type')}
            data={MAINTENANCE_TYPES.map((x) => ({ value: x, label: t(`maintenance.types.${x}`) }))}
            value={type}
            onChange={(v) => v && setType(v as MaintenanceType)}
            allowDeselect={false}
          />
        </SimpleGrid>
        <Textarea
          label={t('maintenance.description')}
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          maxLength={1000}
          autosize
          minRows={2}
          required
          data-autofocus
        />
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
          <NumberInput
            label={t('maintenance.cost')}
            value={cost}
            onChange={(v) => setCost(v === '' ? '' : Number(v))}
            prefix={`${currencySymbol(currency, i18n.resolvedLanguage ?? 'es')} `}
            decimalScale={2}
            allowNegative={false}
            inputMode="decimal"
            {...separators}
          />
          <TextInput
            label={t('maintenance.vendor')}
            value={vendor}
            onChange={(e) => setVendor(e.currentTarget.value)}
            maxLength={150}
          />
        </SimpleGrid>
        <Select
          label={t('maintenance.statusAfter')}
          description={t('maintenance.statusAfterHint')}
          data={ITEM_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))}
          value={status}
          onChange={(v) => v && setStatus(v as ItemStatus)}
          allowDeselect={false}
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

/** Registrar un mantenimiento (y, si cambió, el estado del equipo). */
export function MaintenanceModal({
  item,
  onClose,
  onSaved,
}: {
  item: InventoryItem | null;
  onClose: () => void;
  onSaved: (i: InventoryItem) => void;
}) {
  const { t } = useTranslation('inventory');
  return (
    <ResponsiveModal opened={item !== null} onClose={onClose} title={t('maintenance.newTitle')}>
      {item && <MaintenanceForm item={item} onClose={onClose} onSaved={onSaved} />}
    </ResponsiveModal>
  );
}
