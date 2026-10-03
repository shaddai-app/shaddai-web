import {
  ActionIcon,
  Badge,
  Button,
  Card,
  FileButton,
  Grid,
  Group,
  Image,
  Loader,
  Menu,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconBox,
  IconCamera,
  IconDots,
  IconPencil,
  IconPlus,
  IconPrinter,
  IconTrash,
} from '@tabler/icons-react';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import QRCode from 'qrcode';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { inventoryApi, type InventoryItem } from '../../../../api/inventory';
import { saveBlob } from '../../../../api/people';
import { requirePermission } from '../../../../auth/guards';
import { can } from '../../../../auth/permissions';
import { meQuery } from '../../../../auth/session';
import { FormError } from '../../../../components/FormError';
import { useFileUrl } from '../../../../components/use-file-url';
import { useChurchCurrency, useMoney } from '../../../../features/finance/common';
import { STATUS_COLORS, useCategoryLabel } from '../../../../features/inventory/common';
import { ItemFormModal } from '../../../../features/inventory/ItemFormModal';
import { LoanCard } from '../../../../features/inventory/LoanCard';
import { MaintenanceModal } from '../../../../features/inventory/MaintenanceModal';
import { formatDate } from '../../../../features/people/format';
import { errorMessage } from '../../../../i18n/errors';
import { PageHeader } from '../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/inventario/$id')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'inventario.ver'),
  component: ItemPage,
});

function Photo({ item, manage, onChanged }: { item: InventoryItem; manage: boolean; onChanged: () => void }) {
  const { t } = useTranslation('inventory');
  const url = useFileUrl(item.photoFileId);
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<unknown>, message?: string) => {
    setBusy(true);
    try {
      await action();
      onChanged();
      if (message) notifications.show({ color: 'teal', message });
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };
  if (!item.photoFileId && !manage) return null;
  return (
    <Card withBorder radius="lg" p={0} style={{ overflow: 'hidden' }}>
      {url ? (
        <Image src={url} alt={t('photo.alt', { name: item.name })} mah={320} fit="contain" bg="gray.1" />
      ) : (
        <Group justify="center" h={140} bg="var(--mantine-color-default-hover)">
          {item.photoFileId ? <Loader size="sm" /> : <IconBox size={48} stroke={1.2} color="gray" />}
        </Group>
      )}
      {manage && (
        <Group p="sm" gap="xs" justify="center">
          <FileButton
            accept="image/png,image/jpeg,image/webp"
            onChange={(file) =>
              file && void run(() => inventoryApi.uploadPhoto(item.id, file), t('photo.updated'))
            }
          >
            {(props) => (
              <Button
                {...props}
                variant="default"
                size="xs"
                leftSection={<IconCamera size={16} />}
                loading={busy}
              >
                {item.photoFileId ? t('photo.change') : t('photo.upload')}
              </Button>
            )}
          </FileButton>
          {item.photoFileId && (
            <Button
              variant="subtle"
              color="red"
              size="xs"
              disabled={busy}
              onClick={() => void run(() => inventoryApi.removePhoto(item.id))}
            >
              {t('photo.remove')}
            </Button>
          )}
        </Group>
      )}
    </Card>
  );
}

function LabelCard({ item, manage }: { item: InventoryItem; manage: boolean }) {
  const { t } = useTranslation('inventory');
  const [busy, setBusy] = useState(false);
  const qr = useQuery({
    queryKey: ['qr', item.qrUrl],
    queryFn: () => QRCode.toDataURL(item.qrUrl, { width: 400, margin: 1, errorCorrectionLevel: 'M' }),
    staleTime: Infinity,
  });
  const print = async () => {
    setBusy(true);
    try {
      saveBlob(await inventoryApi.label(item.id), `${t('labelsFile')}-${item.code}.pdf`);
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card withBorder radius="lg">
      <Title order={2} size="h6" mb="sm">
        {t('qr.title')}
      </Title>
      <Group gap="md" wrap="nowrap" align="flex-start">
        {qr.data && (
          <Image
            src={qr.data}
            alt={item.code}
            w={112}
            h={112}
            bg="white"
            radius="sm"
            style={{ flexShrink: 0 }}
          />
        )}
        <Stack gap={6} style={{ minWidth: 0 }}>
          <Text fw={700} size="lg">
            {item.code}
          </Text>
          <Text size="xs" c="dimmed">
            {t('qr.hint')}
          </Text>
        </Stack>
      </Group>
      {manage && (
        <Button
          mt="sm"
          variant="default"
          fullWidth
          leftSection={<IconPrinter size={16} />}
          loading={busy}
          onClick={() => void print()}
        >
          {t('printLabel')}
        </Button>
      )}
    </Card>
  );
}

function ItemPage() {
  const { t } = useTranslation(['inventory', 'common']);
  const id = Number(Route.useParams().id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me } = useSuspenseQuery(meQuery());
  const categoryLabel = useCategoryLabel();
  const money = useMoney();
  const currency = useChurchCurrency();
  const [editing, setEditing] = useState(false);
  const [addingMaintenance, setAddingMaintenance] = useState(false);
  const query = useQuery({ queryKey: ['inventory', 'detail', id], queryFn: () => inventoryApi.get(id) });
  const manage = can(me, 'inventario.gestionar');
  const canLend = can(me, 'inventario.prestamos');

  if (query.isPending) return <Loader />;
  if (query.isError) return <FormError error={query.error} />;
  const item = query.data;
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['inventory'] });
  const saved = (next: InventoryItem) => {
    queryClient.setQueryData(['inventory', 'detail', id], next);
    void queryClient.invalidateQueries({ queryKey: ['inventory', 'list'] });
  };

  const remove = () =>
    modals.openConfirmModal({
      title: t('deleteTitle', { name: item.name }),
      children: <Text size="sm">{t('deleteBody')}</Text>,
      labels: { confirm: t('delete'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await inventoryApi.remove(item.id);
          refresh();
          notifications.show({ color: 'teal', message: t('deleted') });
          void navigate({ to: '/inventario' });
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  const removeMaintenance = (maintenanceId: number) =>
    modals.openConfirmModal({
      title: t('maintenance.deleteTitle'),
      children: <Text size="sm">{t('maintenance.deleteBody')}</Text>,
      labels: { confirm: t('maintenance.delete'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          saved(await inventoryApi.removeMaintenance(maintenanceId));
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  const details: [string, string | null][] = [
    [t('details.category'), categoryLabel(item.category)],
    [t('details.campus'), item.campus?.name ?? null],
    [t('details.brand'), item.brand],
    [t('details.model'), item.model],
    [t('details.serialNumber'), item.serialNumber],
    [t('details.location'), item.location],
    [t('details.purchaseDate'), formatDate(item.purchaseDate)],
    [t('details.purchaseValue'), item.purchaseValue === null ? null : money(item.purchaseValue, currency)],
  ];

  return (
    <>
      <PageHeader
        back={{ to: '/inventario' }}
        title={item.name}
        badge={
          <Badge color={STATUS_COLORS[item.status]} variant="light">
            {t(`status.${item.status}`)}
          </Badge>
        }
        description={`${item.code} · ${categoryLabel(item.category)}`}
        actions={
          manage && (
            <Group gap="xs">
              <Button leftSection={<IconPencil size={18} />} onClick={() => setEditing(true)}>
                {t('edit')}
              </Button>
              <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                  <ActionIcon variant="default" size="lg" aria-label={t('common:actions.more')}>
                    <IconDots size={18} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={remove}>
                    {t('delete')}
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          )
        }
      />
      <Grid gap="md">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="md">
            <LoanCard item={item} canLend={canLend} />
            <Card withBorder radius="lg">
              <Title order={2} size="h6" mb="sm">
                {t('details.title')}
              </Title>
              <Stack gap={6}>
                {details.map(([label, value]) =>
                  value ? (
                    <Group key={label} justify="space-between" wrap="nowrap" gap="md" align="flex-start">
                      <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
                        {label}
                      </Text>
                      <Text size="sm" fw={500} ta="right" style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                        {value}
                      </Text>
                    </Group>
                  ) : null,
                )}
              </Stack>
              {item.notes && (
                <Text size="sm" mt="md" style={{ whiteSpace: 'pre-wrap' }}>
                  {item.notes}
                </Text>
              )}
            </Card>
            <Card withBorder radius="lg">
              <Group justify="space-between" mb="sm" gap="sm">
                <div>
                  <Title order={2} size="h6">
                    {t('maintenance.title')}
                  </Title>
                  {item.maintenanceCost > 0 && (
                    <Text size="xs" c="dimmed">
                      {t('maintenance.total', { amount: money(item.maintenanceCost, currency) })}
                    </Text>
                  )}
                </div>
                {manage && (
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconPlus size={16} />}
                    onClick={() => setAddingMaintenance(true)}
                  >
                    {t('maintenance.add')}
                  </Button>
                )}
              </Group>
              {item.maintenance.length === 0 ? (
                <Text size="sm" c="dimmed">
                  {t('maintenance.empty')}
                </Text>
              ) : (
                <Stack gap={0}>
                  {item.maintenance.map((m, i) => (
                    <Group
                      key={m.id}
                      justify="space-between"
                      align="flex-start"
                      wrap="nowrap"
                      gap="sm"
                      py="xs"
                      style={{ borderTop: i ? '1px solid var(--mantine-color-default-border)' : undefined }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <Group gap={6}>
                          <Text size="sm" fw={500}>
                            {formatDate(m.date)}
                          </Text>
                          <Badge size="xs" variant="light" color={m.type === 'repair' ? 'orange' : 'blue'}>
                            {t(`maintenance.types.${m.type}`)}
                          </Badge>
                        </Group>
                        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                          {m.description}
                        </Text>
                        {(m.vendor || m.cost !== null) && (
                          <Text size="xs" c="dimmed">
                            {[m.vendor, m.cost !== null && money(m.cost, currency)]
                              .filter(Boolean)
                              .join(' · ')}
                          </Text>
                        )}
                      </div>
                      {manage && (
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          onClick={() => removeMaintenance(m.id)}
                          aria-label={t('maintenance.delete')}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      )}
                    </Group>
                  ))}
                </Stack>
              )}
            </Card>
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="md">
            <Photo
              item={item}
              manage={manage}
              onChanged={() => void queryClient.invalidateQueries({ queryKey: ['inventory'] })}
            />
            <LabelCard item={item} manage={manage} />
          </Stack>
        </Grid.Col>
      </Grid>
      <ItemFormModal
        opened={editing}
        item={item}
        onClose={() => setEditing(false)}
        onSaved={(next) => {
          setEditing(false);
          saved(next);
          notifications.show({ color: 'teal', message: t('common:saved') });
        }}
      />
      <MaintenanceModal
        item={addingMaintenance ? item : null}
        onClose={() => setAddingMaintenance(false)}
        onSaved={(next) => {
          setAddingMaintenance(false);
          saved(next);
          notifications.show({ color: 'teal', message: t('maintenance.saved') });
        }}
      />
    </>
  );
}
