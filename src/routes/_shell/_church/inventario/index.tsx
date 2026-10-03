import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Chip,
  Group,
  Loader,
  type GroupProps,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconBox, IconPlus, IconPrinter, IconQrcode, IconSearch, IconX } from '@tabler/icons-react';
import { keepPreviousData, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  inventoryApi,
  ITEM_STATUSES,
  type InventoryListItem,
  type ItemStatus,
} from '../../../../api/inventory';
import { saveBlob } from '../../../../api/people';
import { requirePermission } from '../../../../auth/guards';
import { can } from '../../../../auth/permissions';
import { meQuery } from '../../../../auth/session';
import { FormError } from '../../../../components/FormError';
import { UnstyledLink } from '../../../../components/links';
import { useFileUrl } from '../../../../components/use-file-url';
import { canScan, STATUS_COLORS, useCategoryLabel } from '../../../../features/inventory/common';
import { ItemFormModal } from '../../../../features/inventory/ItemFormModal';
import { LoanBadge } from '../../../../features/inventory/LoanModals';
import { ScanModal } from '../../../../features/inventory/ScanModal';
import { campusesQuery, useCatalogOptions } from '../../../../features/people/catalog';
import { errorMessage } from '../../../../i18n/errors';
import { PageHeader } from '../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/inventario/')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'inventario.ver'),
  component: InventoryPage,
});

type Tab = 'inUse' | 'onLoan' | ItemStatus;

function Thumb({ item }: { item: InventoryListItem }) {
  const url = useFileUrl(item.photoFileId);
  return (
    <Avatar src={url} radius="md" size={40} color="gray" variant="light">
      <IconBox size={20} />
    </Avatar>
  );
}

/** Estado (si no funciona normal) y préstamo abierto. */
function Badges({
  item,
  size,
  ...props
}: { item: InventoryListItem; size?: 'xs' | 'sm' } & Omit<GroupProps, 'children'>) {
  const { t } = useTranslation('inventory');
  if (item.status === 'ok' && !item.loan) return null;
  return (
    <Group gap={4} wrap="nowrap" {...props}>
      {item.status !== 'ok' && (
        <Badge size={size} color={STATUS_COLORS[item.status]} variant="light">
          {t(`status.${item.status}`)}
        </Badge>
      )}
      {item.loan && <LoanBadge loan={item.loan} size={size} />}
    </Group>
  );
}

function InventoryPage() {
  const { t } = useTranslation(['inventory', 'common']);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me } = useSuspenseQuery(meQuery());
  const categoryLabel = useCategoryLabel();
  const categories = useCatalogOptions('inventory_category');
  const { data: campuses = [] } = useQuery(campusesQuery());
  const [q, setQ] = useState('');
  const [debounced] = useDebouncedValue(q, 300);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [campusId, setCampusId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('inUse');
  const [selected, setSelected] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [printing, setPrinting] = useState(false);
  const manage = can(me, 'inventario.gestionar');

  const query = useQuery({
    queryKey: ['inventory', 'list', debounced, categoryId, campusId, tab],
    queryFn: () =>
      inventoryApi.list({
        q: debounced || undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        campusId: campusId ? Number(campusId) : undefined,
        status: tab === 'inUse' || tab === 'onLoan' ? undefined : tab,
        onLoan: tab === 'onLoan' || undefined,
        pageSize: 200,
      }),
    placeholderData: keepPreviousData,
  });
  const counts = query.data?.counts;
  const inUse = counts ? counts.ok + counts.faulty + counts.repair : 0;
  const items = query.data?.items ?? [];
  const allSelected = items.length > 0 && items.every((i) => selected.includes(i.id));

  const toggle = (id: number) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const printLabels = async () => {
    setPrinting(true);
    try {
      saveBlob(await inventoryApi.labels(selected), `${t('labelsFile')}.pdf`);
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    } finally {
      setPrinting(false);
    }
  };
  const onToken = useCallback(
    (token: string) => {
      setScanning(false);
      void navigate({ to: '/i/$token', params: { token } });
    },
    [navigate],
  );

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Group gap="xs">
            {canScan() && (
              <Button
                variant="default"
                leftSection={<IconQrcode size={18} />}
                onClick={() => setScanning(true)}
              >
                {t('scan.open')}
              </Button>
            )}
            {manage && (
              <Button leftSection={<IconPlus size={18} />} onClick={() => setCreating(true)}>
                {t('new')}
              </Button>
            )}
          </Group>
        }
      />
      <Stack gap="md">
        <Group gap="sm" wrap="wrap">
          <TextInput
            style={{ flex: '1 1 240px' }}
            leftSection={<IconSearch size={16} />}
            placeholder={t('search')}
            aria-label={t('search')}
            value={q}
            onChange={(e) => setQ(e.currentTarget.value)}
          />
          <Select
            style={{ flex: '0 1 220px' }}
            data={categories}
            value={categoryId}
            onChange={setCategoryId}
            placeholder={t('allCategories')}
            aria-label={t('details.category')}
            clearable
            searchable
          />
          {campuses.length > 1 && (
            <Select
              style={{ flex: '0 1 200px' }}
              data={campuses.map((c) => ({ value: String(c.id), label: c.name }))}
              value={campusId}
              onChange={setCampusId}
              placeholder={t('allCampuses')}
              aria-label={t('details.campus')}
              clearable
            />
          )}
        </Group>
        <Chip.Group value={tab} onChange={(v) => setTab(v as Tab)}>
          <Group gap={6}>
            <Chip value="inUse" size="sm">
              {t('inUse')}
              {counts ? ` · ${inUse}` : ''}
            </Chip>
            {ITEM_STATUSES.map((s) => (
              <Chip key={s} value={s} size="sm" color={STATUS_COLORS[s]}>
                {t(`status.${s}`)}
                {counts ? ` · ${counts[s]}` : ''}
              </Chip>
            ))}
            <Chip value="onLoan" size="sm" color="marfil">
              {t('onLoanChip')}
              {counts ? ` · ${counts.onLoan}` : ''}
            </Chip>
          </Group>
        </Chip.Group>
        {query.isPending ? (
          <Loader />
        ) : query.isError ? (
          <FormError error={query.error} />
        ) : items.length === 0 ? (
          <Text c="dimmed">
            {debounced || categoryId || campusId || tab !== 'inUse' ? t('noResults') : t('empty')}
          </Text>
        ) : (
          <Card withBorder radius="lg" p={0}>
            {manage && (
              // Las acciones de la selección van en esta cabecera (altura fija): no corren las filas.
              <Group
                px="md"
                h={44}
                justify="space-between"
                wrap="nowrap"
                gap="xs"
                style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
              >
                <Checkbox
                  size="xs"
                  label={selected.length ? t('selected', { count: selected.length }) : t('selectAll')}
                  checked={allSelected}
                  indeterminate={!allSelected && items.some((i) => selected.includes(i.id))}
                  onChange={() =>
                    setSelected(
                      allSelected
                        ? selected.filter((id) => !items.some((i) => i.id === id))
                        : [...new Set([...selected, ...items.map((i) => i.id)])],
                    )
                  }
                />
                {selected.length > 0 && (
                  <Group gap={4} wrap="nowrap">
                    <Button
                      size="compact-sm"
                      leftSection={<IconPrinter size={16} />}
                      loading={printing}
                      onClick={() => void printLabels()}
                    >
                      {t('printLabels')}
                    </Button>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      onClick={() => setSelected([])}
                      aria-label={t('clearSelection')}
                    >
                      <IconX size={16} />
                    </ActionIcon>
                  </Group>
                )}
              </Group>
            )}
            {items.map((item, i) => (
              <Group
                key={item.id}
                gap={0}
                wrap="nowrap"
                style={{ borderTop: i ? '1px solid var(--mantine-color-default-border)' : undefined }}
              >
                {manage && (
                  <Checkbox
                    pl="md"
                    size="sm"
                    checked={selected.includes(item.id)}
                    onChange={() => toggle(item.id)}
                    aria-label={t('selectItem', { name: item.name })}
                  />
                )}
                <UnstyledLink
                  to="/inventario/$id"
                  params={{ id: String(item.id) }}
                  style={{ display: 'block', flex: 1, minWidth: 0, padding: '10px 16px' }}
                >
                  <Group justify="space-between" wrap="nowrap" gap="sm">
                    <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                      <Thumb item={item} />
                      <div style={{ minWidth: 0 }}>
                        <Text fw={500} truncate>
                          {item.name}
                        </Text>
                        <Text size="xs" c="dimmed" truncate>
                          {[
                            item.code,
                            categoryLabel(item.category),
                            [item.brand, item.model].filter(Boolean).join(' '),
                            item.location,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                        <Badges item={item} hiddenFrom="xs" size="xs" mt={4} />
                      </div>
                    </Group>
                    <Badges item={item} visibleFrom="xs" style={{ flexShrink: 0 }} />
                  </Group>
                </UnstyledLink>
              </Group>
            ))}
          </Card>
        )}
        {query.data && query.data.total > items.length && (
          <Text size="xs" c="dimmed">
            {t('showing', { shown: items.length, total: query.data.total })}
          </Text>
        )}
      </Stack>
      <ItemFormModal
        opened={creating}
        item={null}
        onClose={() => setCreating(false)}
        onSaved={(item) => {
          setCreating(false);
          void queryClient.invalidateQueries({ queryKey: ['inventory'] });
          notifications.show({ color: 'teal', message: t('created') });
          void navigate({ to: '/inventario/$id', params: { id: String(item.id) } });
        }}
      />
      <ScanModal opened={scanning} onClose={() => setScanning(false)} onToken={onToken} />
    </>
  );
}
