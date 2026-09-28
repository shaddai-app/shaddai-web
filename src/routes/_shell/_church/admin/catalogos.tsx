import {
  ActionIcon,
  Badge,
  Button,
  Card,
  ColorSwatch,
  Group,
  Loader,
  Menu,
  ScrollArea,
  Stack,
  Switch,
  Tabs,
  Text,
  Tooltip,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconArrowDown, IconArrowUp, IconDots, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import {
  catalogsApi,
  tagsApi,
  CATALOG_TYPES,
  type CatalogItem,
  type CatalogType,
  type Tag,
} from '../../../../api/people';
import { requirePermission } from '../../../../auth/guards';
import { FormError } from '../../../../components/FormError';
import { catalogQuery, tagsQuery, useCatalogLabel } from '../../../../features/people/catalog';
import { CatalogItemModal, type CatalogItemDraft } from '../../../../features/people/CatalogItemModal';
import { StepsPanel } from '../../../../features/consolidation/StepsPanel';
import { errorMessage } from '../../../../i18n/errors';
import { PageHeader } from '../../../../layout/PageHeader';

const TABS = [...CATALOG_TYPES, 'tags', 'consolidation_steps'] as const;
type TabKey = (typeof TABS)[number];

export const Route = createFileRoute('/_shell/_church/admin/catalogos')({
  validateSearch: z.object({ tab: z.enum(TABS).optional() }),
  beforeLoad: ({ context }) => requirePermission(context.me, 'catalogos.gestionar'),
  component: CatalogsPage,
});

const Swatch = ({ color }: { color: string | null }) =>
  color ? (
    <ColorSwatch color={`var(--mantine-color-${color}-6)`} size={14} />
  ) : (
    <ColorSwatch color="transparent" size={14} withShadow />
  );

type Editing = { mode: 'create' } | { mode: 'edit'; item: CatalogItem } | null;

function CatalogPanel({ type }: { type: CatalogType }) {
  const { t } = useTranslation(['people', 'common']);
  const label = useCatalogLabel();
  const queryClient = useQueryClient();
  const query = useQuery(catalogQuery(type, true));
  const [editing, setEditing] = useState<Editing>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['catalog', type] });
  const act = async (fn: () => Promise<unknown>, message = t('catalogs.saved')) => {
    try {
      await fn();
      notifications.show({ color: 'teal', message });
      await refresh();
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    }
  };

  if (query.isPending) return <Loader />;
  if (query.error) return <FormError error={query.error} />;
  const items = query.data;

  const move = (index: number, delta: -1 | 1) => {
    const ids = items.map((i) => i.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + delta, 0, moved!);
    void act(() => catalogsApi.reorder(type, ids));
  };

  const save = async (draft: CatalogItemDraft) => {
    if (editing?.mode === 'edit') {
      await catalogsApi.update(type, editing.item.id, { name: draft.name, color: draft.color });
    } else {
      await catalogsApi.create(type, { name: draft.name ?? '', color: draft.color });
    }
    setEditing(null);
    notifications.show({ color: 'teal', message: t('catalogs.saved') });
    await refresh();
  };

  const remove = (item: CatalogItem) =>
    modals.openConfirmModal({
      title: t('catalogs.deleteTitle', { name: label(type, item) }),
      labels: { confirm: t('catalogs.delete'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: () => void act(() => catalogsApi.remove(type, item.id), t('catalogs.deleted')),
    });

  const systemLabel = (item: CatalogItem) => label(type, { name: null, systemKey: item.systemKey });

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="flex-start">
        <Text size="sm" c="dimmed" maw={640}>
          {t(`catalogs.hints.${type}`)}
        </Text>
        <Button size="sm" leftSection={<IconPlus size={16} />} onClick={() => setEditing({ mode: 'create' })}>
          {t('catalogs.add')}
        </Button>
      </Group>
      <Card withBorder radius="lg" p={0}>
        {items.length === 0 ? (
          <Text c="dimmed" p="md">
            {t('catalogs.empty')}
          </Text>
        ) : (
          items.map((item, i) => (
            <Group
              key={item.id}
              justify="space-between"
              wrap="nowrap"
              px="md"
              py="sm"
              style={{ borderTop: i ? '1px solid var(--mantine-color-default-border)' : undefined }}
              opacity={item.isActive ? 1 : 0.55}
            >
              <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                <Swatch color={item.color} />
                <Text size="sm" fw={500} truncate>
                  {label(type, item)}
                </Text>
                {item.systemKey && (
                  <Tooltip label={t('catalogs.systemHint')} multiline w={260}>
                    <Badge size="xs" variant="default">
                      {t('catalogs.system')}
                    </Badge>
                  </Tooltip>
                )}
              </Group>
              <Group gap={4} wrap="nowrap">
                <Switch
                  size="sm"
                  checked={item.isActive}
                  aria-label={item.isActive ? t('catalogs.deactivate') : t('catalogs.activate')}
                  onChange={(e) =>
                    void act(() => catalogsApi.update(type, item.id, { isActive: e.currentTarget.checked }))
                  }
                  mr="xs"
                />
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  disabled={i === 0}
                  aria-label={t('catalogs.moveUp')}
                  onClick={() => move(i, -1)}
                  visibleFrom="xs"
                >
                  <IconArrowUp size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  disabled={i === items.length - 1}
                  aria-label={t('catalogs.moveDown')}
                  onClick={() => move(i, 1)}
                  visibleFrom="xs"
                >
                  <IconArrowDown size={16} />
                </ActionIcon>
                <Menu position="bottom-end" withinPortal>
                  <Menu.Target>
                    <ActionIcon variant="subtle" color="gray" aria-label={t('detail.actions')}>
                      <IconDots size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<IconPencil size={16} />}
                      onClick={() => setEditing({ mode: 'edit', item })}
                    >
                      {t('catalogs.rename')}
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconArrowUp size={16} />}
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                      hiddenFrom="xs"
                    >
                      {t('catalogs.moveUp')}
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconArrowDown size={16} />}
                      disabled={i === items.length - 1}
                      onClick={() => move(i, 1)}
                      hiddenFrom="xs"
                    >
                      {t('catalogs.moveDown')}
                    </Menu.Item>
                    {!item.systemKey && (
                      <Menu.Item
                        color="red"
                        leftSection={<IconTrash size={16} />}
                        onClick={() => remove(item)}
                      >
                        {t('catalogs.delete')}
                      </Menu.Item>
                    )}
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Group>
          ))
        )}
      </Card>
      <CatalogItemModal
        opened={editing !== null}
        title={editing?.mode === 'edit' ? t('catalogs.rename') : t('catalogs.add')}
        initial={
          editing?.mode === 'edit'
            ? { name: editing.item.name, color: editing.item.color }
            : { name: null, color: null }
        }
        systemLabel={
          editing?.mode === 'edit' && editing.item.systemKey ? systemLabel(editing.item) : undefined
        }
        onClose={() => setEditing(null)}
        onSave={save}
      />
    </Stack>
  );
}

function TagsPanel() {
  const { t } = useTranslation(['people', 'common']);
  const queryClient = useQueryClient();
  const query = useQuery(tagsQuery());
  const [editing, setEditing] = useState<{ tag: Tag | null } | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['tags'] });

  if (query.isPending) return <Loader />;
  if (query.error) return <FormError error={query.error} />;

  const save = async (draft: CatalogItemDraft) => {
    const body = { name: draft.name ?? '', color: draft.color };
    if (editing?.tag) await tagsApi.update(editing.tag.id, body);
    else await tagsApi.create(body);
    setEditing(null);
    notifications.show({ color: 'teal', message: t('catalogs.saved') });
    await refresh();
  };

  const remove = (tag: Tag) =>
    modals.openConfirmModal({
      title: t('catalogs.deleteTitle', { name: tag.name }),
      children: <Text size="sm">{t('catalogs.tagDeleteBody')}</Text>,
      labels: { confirm: t('catalogs.delete'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await tagsApi.remove(tag.id);
          notifications.show({ color: 'teal', message: t('catalogs.deleted') });
          await refresh();
          void queryClient.invalidateQueries({ queryKey: ['people'] });
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="flex-start">
        <Text size="sm" c="dimmed" maw={640}>
          {t('catalogs.hints.tags')}
        </Text>
        <Button size="sm" leftSection={<IconPlus size={16} />} onClick={() => setEditing({ tag: null })}>
          {t('catalogs.add')}
        </Button>
      </Group>
      <Card withBorder radius="lg" p={0}>
        {query.data.length === 0 ? (
          <Text c="dimmed" p="md">
            {t('catalogs.empty')}
          </Text>
        ) : (
          query.data.map((tag, i) => (
            <Group
              key={tag.id}
              justify="space-between"
              wrap="nowrap"
              px="md"
              py="sm"
              style={{ borderTop: i ? '1px solid var(--mantine-color-default-border)' : undefined }}
            >
              <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                <Swatch color={tag.color} />
                <Text size="sm" fw={500} truncate>
                  {tag.name}
                </Text>
                <Text size="xs" c="dimmed">
                  {t('catalogs.people', { count: tag.peopleCount ?? 0 })}
                </Text>
              </Group>
              <Group gap={4} wrap="nowrap">
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label={t('catalogs.rename')}
                  onClick={() => setEditing({ tag })}
                >
                  <IconPencil size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  aria-label={t('catalogs.delete')}
                  onClick={() => remove(tag)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Group>
          ))
        )}
      </Card>
      <CatalogItemModal
        opened={editing !== null}
        title={editing?.tag ? t('catalogs.rename') : t('catalogs.add')}
        initial={{ name: editing?.tag?.name ?? null, color: editing?.tag?.color ?? null }}
        onClose={() => setEditing(null)}
        onSave={save}
      />
    </Stack>
  );
}

function CatalogsPage() {
  const { t } = useTranslation('people');
  const { tab = 'person_status' } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <>
      <PageHeader title={t('catalogs.title')} description={t('catalogs.description')} />
      <Tabs
        value={tab}
        onChange={(v) => void navigate({ search: { tab: (v ?? 'person_status') as TabKey }, replace: true })}
        keepMounted={false}
      >
        <ScrollArea type="never" mb="md">
          <Tabs.List style={{ flexWrap: 'nowrap' }}>
            {TABS.map((k) => (
              <Tabs.Tab key={k} value={k}>
                {t(`catalogs.types.${k}`)}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </ScrollArea>
        {CATALOG_TYPES.map((type) => (
          <Tabs.Panel key={type} value={type}>
            <CatalogPanel type={type} />
          </Tabs.Panel>
        ))}
        <Tabs.Panel value="tags">
          <TagsPanel />
        </Tabs.Panel>
        <Tabs.Panel value="consolidation_steps">
          <StepsPanel />
        </Tabs.Panel>
      </Tabs>
    </>
  );
}
