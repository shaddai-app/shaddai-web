import {
  ActionIcon,
  Button,
  Card,
  ColorSwatch,
  Group,
  Loader,
  Stack,
  Switch,
  Text,
  Tooltip,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { zonesApi, type Zone } from '../../../../api/cells';
import { requirePermission } from '../../../../auth/guards';
import { FormError } from '../../../../components/FormError';
import { AnchorLink } from '../../../../components/links';
import { ResponsiveModal } from '../../../../components/ResponsiveModal';
import { StructureTabs, ZoneForm } from '../../../../features/cells/StructureForms';
import { networksQuery, useStructureLabels, zonesQuery } from '../../../../features/cells/structure';
import { fullName } from '../../../../features/people/format';
import { errorMessage } from '../../../../i18n/errors';
import { PageHeader } from '../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/estructura/zonas')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'estructura.gestionar'),
  component: ZonesPage,
});

function ZonesPage() {
  const { t } = useTranslation(['cells', 'common']);
  const labels = useStructureLabels();
  const queryClient = useQueryClient();
  const query = useQuery(zonesQuery());
  const networks = useQuery(networksQuery());
  const [editing, setEditing] = useState<{ zone: Zone | null } | null>(null);
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['zones'] }),
      queryClient.invalidateQueries({ queryKey: ['networks'] }),
    ]);
  const noNetworks = networks.isSuccess && networks.data.length === 0;

  const toggle = async (z: Zone, isActive: boolean) => {
    try {
      await zonesApi.update(z.id, { isActive });
      await refresh();
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    }
  };

  const remove = (z: Zone) =>
    modals.openConfirmModal({
      title: t('structure.deleteTitle', { name: z.name }),
      labels: { confirm: t('structure.delete'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await zonesApi.remove(z.id);
          await refresh();
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  // Agrupadas por red, en el orden que devuelve la API (red y nombre).
  const groups: { network: Zone['network']; zones: Zone[] }[] = [];
  for (const z of query.data ?? []) {
    const group = groups.find((g) => g.network.id === z.network.id);
    if (group) group.zones.push(z);
    else groups.push({ network: z.network, zones: [z] });
  }

  return (
    <>
      <PageHeader
        title={t('structure.title')}
        description={t('structure.description')}
        actions={
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={() => setEditing({ zone: null })}
            disabled={noNetworks}
          >
            {t('structure.add', { label: labels.zone.toLowerCase() })}
          </Button>
        }
      />
      <StructureTabs value="zonas" />
      <FormError error={query.error} />
      {query.isPending ? (
        <Loader />
      ) : groups.length === 0 ? (
        <Text c="dimmed">
          {noNetworks ? t('structure.needNetwork', { network: labels.networks }) : t('structure.emptyZones')}
        </Text>
      ) : (
        <Stack gap="md">
          {groups.map(({ network, zones }) => (
            <Card key={network.id} withBorder radius="lg" p={0}>
              <Group gap="xs" px="md" py="xs" bg="var(--mantine-color-default-hover)">
                <ColorSwatch
                  color={`var(--mantine-color-${network.color ?? 'gray'}-6)`}
                  size={12}
                  withShadow={false}
                />
                <Text size="sm" fw={600}>
                  {network.name}
                </Text>
              </Group>
              {zones.map((z) => (
                <Group
                  key={z.id}
                  justify="space-between"
                  wrap="nowrap"
                  px="md"
                  py="sm"
                  style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
                  opacity={z.isActive ? 1 : 0.55}
                >
                  <div style={{ minWidth: 0 }}>
                    <Text size="sm" fw={500}>
                      {z.name}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {z.supervisor && `${t('structure.supervisor')}: ${fullName(z.supervisor)} · `}
                      <AnchorLink to="/celulas" search={{ zoneId: z.id }} size="xs">
                        {t('structure.cellCount', { count: z.cellCount })}
                      </AnchorLink>
                    </Text>
                  </div>
                  <Group gap={4} wrap="nowrap">
                    <Switch
                      size="sm"
                      checked={z.isActive}
                      aria-label={z.isActive ? t('structure.active') : t('structure.inactive')}
                      onChange={(e) => void toggle(z, e.currentTarget.checked)}
                      mr="xs"
                    />
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      aria-label={t('structure.edit')}
                      onClick={() => setEditing({ zone: z })}
                    >
                      <IconPencil size={16} />
                    </ActionIcon>
                    <Tooltip label={z.cellCount > 0 ? t('structure.hasCells') : t('structure.delete')}>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        aria-label={t('structure.delete')}
                        disabled={z.cellCount > 0}
                        onClick={() => remove(z)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>
              ))}
            </Card>
          ))}
        </Stack>
      )}
      <ResponsiveModal
        opened={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.zone ? t('structure.edit') : t('structure.add', { label: labels.zone.toLowerCase() })}
        size="md"
      >
        {editing && (
          <ZoneForm
            zone={editing.zone}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              notifications.show({ color: 'teal', message: t('common:saved') });
              void refresh();
            }}
          />
        )}
      </ResponsiveModal>
    </>
  );
}
