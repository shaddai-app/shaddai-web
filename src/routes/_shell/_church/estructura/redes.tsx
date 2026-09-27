import { ActionIcon, Button, Card, ColorSwatch, Group, Loader, Switch, Text, Tooltip } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { networksApi, type Network } from '../../../../api/cells';
import { requirePermission } from '../../../../auth/guards';
import { FormError } from '../../../../components/FormError';
import { ResponsiveModal } from '../../../../components/ResponsiveModal';
import { NetworkForm, StructureTabs } from '../../../../features/cells/StructureForms';
import { networksQuery, useStructureLabels } from '../../../../features/cells/structure';
import { fullName } from '../../../../features/people/format';
import { errorMessage } from '../../../../i18n/errors';
import { PageHeader } from '../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/estructura/redes')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'estructura.gestionar'),
  component: NetworksPage,
});

function NetworksPage() {
  const { t } = useTranslation(['cells', 'common']);
  const labels = useStructureLabels();
  const queryClient = useQueryClient();
  const query = useQuery(networksQuery());
  const [editing, setEditing] = useState<{ network: Network | null } | null>(null);
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['networks'] }),
      queryClient.invalidateQueries({ queryKey: ['zones'] }),
    ]);

  const toggle = async (n: Network, isActive: boolean) => {
    try {
      await networksApi.update(n.id, { isActive });
      await refresh();
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    }
  };

  const remove = (n: Network) =>
    modals.openConfirmModal({
      title: t('structure.deleteTitle', { name: n.name }),
      labels: { confirm: t('structure.delete'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await networksApi.remove(n.id);
          await refresh();
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  return (
    <>
      <PageHeader
        title={t('structure.title')}
        description={t('structure.description')}
        actions={
          <Button leftSection={<IconPlus size={18} />} onClick={() => setEditing({ network: null })}>
            {t('structure.add', { label: labels.network.toLowerCase() })}
          </Button>
        }
      />
      <StructureTabs value="redes" />
      <FormError error={query.error} />
      {query.isPending ? (
        <Loader />
      ) : (
        <Card withBorder radius="lg" p={0}>
          {(query.data ?? []).length === 0 ? (
            <Text c="dimmed" p="md">
              {t('structure.emptyNetworks')}
            </Text>
          ) : (
            query.data!.map((n, i) => (
              <Group
                key={n.id}
                justify="space-between"
                wrap="nowrap"
                px="md"
                py="sm"
                style={{ borderTop: i ? '1px solid var(--mantine-color-default-border)' : undefined }}
                opacity={n.isActive ? 1 : 0.55}
              >
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                  <ColorSwatch
                    color={`var(--mantine-color-${n.color ?? 'gray'}-6)`}
                    size={16}
                    withShadow={false}
                  />
                  <div style={{ minWidth: 0 }}>
                    <Text size="sm" fw={500}>
                      {n.name}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {[
                        n.leader && `${t('structure.leader')}: ${fullName(n.leader)}`,
                        n.campus?.name,
                        t('structure.zoneCount', { count: n.zoneCount, label: labels.zones }),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </div>
                </Group>
                <Group gap={4} wrap="nowrap">
                  <Switch
                    size="sm"
                    checked={n.isActive}
                    aria-label={n.isActive ? t('structure.active') : t('structure.inactive')}
                    onChange={(e) => void toggle(n, e.currentTarget.checked)}
                    mr="xs"
                  />
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    aria-label={t('structure.edit')}
                    onClick={() => setEditing({ network: n })}
                  >
                    <IconPencil size={16} />
                  </ActionIcon>
                  <Tooltip label={n.zoneCount > 0 ? t('structure.hasZones') : t('structure.delete')}>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label={t('structure.delete')}
                      disabled={n.zoneCount > 0}
                      onClick={() => remove(n)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
            ))
          )}
        </Card>
      )}
      <ResponsiveModal
        opened={editing !== null}
        onClose={() => setEditing(null)}
        title={
          editing?.network ? t('structure.edit') : t('structure.add', { label: labels.network.toLowerCase() })
        }
        size="md"
      >
        {editing && (
          <NetworkForm
            network={editing.network}
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
