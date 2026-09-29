import {
  Button,
  Grid,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { inventoryApi, ITEM_STATUSES, type InventoryItem, type ItemStatus } from '../../api/inventory';
import { FormError } from '../../components/FormError';
import { ResponsiveModal } from '../../components/ResponsiveModal';
import { useChurchCurrency } from '../finance/common';
import { currencySymbol, useSeparators } from '../finance/money-input';
import { campusesQuery, useCatalogOptions } from '../people/catalog';

const orNull = (v: string) => (v.trim() === '' ? null : v.trim());
const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,19}$/;

function ItemForm({
  item,
  onClose,
  onSaved,
}: {
  item: InventoryItem | null;
  onClose: () => void;
  onSaved: (i: InventoryItem) => void;
}) {
  const { t, i18n } = useTranslation(['inventory', 'common']);
  const separators = useSeparators();
  const currency = useChurchCurrency();
  const categories = useCatalogOptions('inventory_category');
  const { data: campuses = [] } = useQuery(campusesQuery());
  const [name, setName] = useState(item?.name ?? '');
  const [code, setCode] = useState(item?.code ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(item ? String(item.category.id) : null);
  const [campusId, setCampusId] = useState<string | null>(
    item?.campus
      ? String(item.campus.id)
      : item
        ? null
        : campuses.length === 1
          ? String(campuses[0]!.id)
          : null,
  );
  const [status, setStatus] = useState<ItemStatus>(item?.status ?? 'ok');
  const [brand, setBrand] = useState(item?.brand ?? '');
  const [model, setModel] = useState(item?.model ?? '');
  const [serialNumber, setSerialNumber] = useState(item?.serialNumber ?? '');
  const [location, setLocation] = useState(item?.location ?? '');
  const [purchaseDate, setPurchaseDate] = useState(item?.purchaseDate ?? '');
  const [purchaseValue, setPurchaseValue] = useState<number | ''>(item?.purchaseValue ?? '');
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const codeInvalid = code.trim() !== '' && !CODE_PATTERN.test(code.trim());
  const valid =
    name.trim() !== '' && categoryId !== null && !codeInvalid && (item ? code.trim() !== '' : true);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        setBusy(true);
        setError(null);
        const body = {
          ...(code.trim() ? { code: code.trim().toUpperCase() } : {}),
          name: name.trim(),
          categoryId: Number(categoryId),
          campusId: campusId ? Number(campusId) : null,
          status,
          brand: orNull(brand),
          model: orNull(model),
          serialNumber: orNull(serialNumber),
          location: orNull(location),
          purchaseDate: purchaseDate || null,
          purchaseValue: purchaseValue === '' ? null : purchaseValue,
          notes: orNull(notes),
        };
        try {
          onSaved(item ? await inventoryApi.update(item.id, body) : await inventoryApi.create(body));
        } catch (err) {
          setError(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Stack>
        <FormError error={error} />
        <Grid gap="sm">
          <Grid.Col span={{ base: 12, sm: 8 }}>
            <TextInput
              label={t('form.name')}
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              maxLength={150}
              required
              data-autofocus
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <TextInput
              label={t('form.code')}
              value={code}
              onChange={(e) => setCode(e.currentTarget.value.toUpperCase())}
              maxLength={20}
              description={item ? undefined : t('form.codeHint')}
              error={codeInvalid ? t('form.codeInvalid') : undefined}
              required={!!item}
            />
          </Grid.Col>
        </Grid>
        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing="sm">
          <Select
            label={t('form.category')}
            data={categories}
            value={categoryId}
            onChange={setCategoryId}
            searchable
            required
          />
          <Select
            label={t('form.status')}
            data={ITEM_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))}
            value={status}
            onChange={(v) => v && setStatus(v as ItemStatus)}
            allowDeselect={false}
          />
          {campuses.length > 0 && (
            <Select
              label={t('form.campus')}
              data={campuses.map((c) => ({ value: String(c.id), label: c.name }))}
              value={campusId}
              onChange={setCampusId}
              placeholder={t('form.noCampus')}
              clearable
            />
          )}
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="sm">
          <TextInput
            label={t('form.brand')}
            value={brand}
            onChange={(e) => setBrand(e.currentTarget.value)}
            maxLength={80}
          />
          <TextInput
            label={t('form.model')}
            value={model}
            onChange={(e) => setModel(e.currentTarget.value)}
            maxLength={80}
          />
          <TextInput
            label={t('form.serialNumber')}
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.currentTarget.value)}
            maxLength={80}
          />
        </SimpleGrid>
        <TextInput
          label={t('form.location')}
          placeholder={t('form.locationPlaceholder')}
          value={location}
          onChange={(e) => setLocation(e.currentTarget.value)}
          maxLength={150}
        />
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
          <TextInput
            type="date"
            label={t('form.purchaseDate')}
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.currentTarget.value)}
          />
          <NumberInput
            label={t('form.purchaseValue')}
            value={purchaseValue}
            onChange={(v) => setPurchaseValue(v === '' ? '' : Number(v))}
            prefix={`${currencySymbol(currency, i18n.resolvedLanguage ?? 'es')} `}
            decimalScale={2}
            allowNegative={false}
            inputMode="decimal"
            {...separators}
          />
        </SimpleGrid>
        <Textarea
          label={t('form.notes')}
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
          maxLength={1000}
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

/** Alta y edición de un equipo. */
export function ItemFormModal({
  opened,
  item,
  onClose,
  onSaved,
}: {
  opened: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onSaved: (i: InventoryItem) => void;
}) {
  const { t } = useTranslation('inventory');
  return (
    <ResponsiveModal
      opened={opened}
      onClose={onClose}
      title={item ? t('form.editTitle') : t('form.newTitle')}
    >
      {opened && <ItemForm item={item} onClose={onClose} onSaved={onSaved} />}
    </ResponsiveModal>
  );
}
