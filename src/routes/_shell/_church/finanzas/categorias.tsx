import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Menu,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconArrowDown, IconArrowUp, IconDots, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { CATEGORY_KINDS, financeApi, type CategoryKind, type FinanceCategory } from '../../../../api/finance';
import { requirePermission } from '../../../../auth/guards';
import { FormError } from '../../../../components/FormError';
import { ResponsiveModal } from '../../../../components/ResponsiveModal';
import { categoriesQuery, useCategoryLabel } from '../../../../features/finance/common';
import { errorMessage } from '../../../../i18n/errors';
import { PageHeader } from '../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/finanzas/categorias')({
  validateSearch: z.object({ kind: z.enum(CATEGORY_KINDS).optional() }),
  beforeLoad: ({ context }) => requirePermission(context.me, 'finanzas.categorias'),
  component: CategoriesPage,
});

function CategoryForm({
  kind,
  category,
  onClose,
  onSaved,
}: {
  kind: CategoryKind;
  category: FinanceCategory | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation(['finance', 'common']);
  const categoryLabel = useCategoryLabel();
  const [name, setName] = useState(category?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  // Una categoría del sistema sin nombre propio usa la traducción (vaciar el nombre la restaura).
  const systemName = category?.systemKey
    ? categoryLabel({ name: null, systemKey: category.systemKey })
    : null;
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const trimmed = name.trim();
          if (category) await financeApi.updateCategory(category.id, { name: trimmed || null });
          else await financeApi.createCategory({ kind, name: trimmed });
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
        <TextInput
          label={t('categories.name')}
          placeholder={systemName ?? undefined}
          description={systemName ? t('categories.systemNameHint') : undefined}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          maxLength={100}
          required={!systemName}
          data-autofocus
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={busy} disabled={!systemName && !name.trim()}>
            {t('common:actions.save')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

function KindPanel({ kind }: { kind: CategoryKind }) {
  const { t } = useTranslation(['finance', 'common']);
  const categoryLabel = useCategoryLabel();
  const queryClient = useQueryClient();
  const query = useQuery(categoriesQuery(kind, true));
  const [editing, setEditing] = useState<{ category: FinanceCategory | null } | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['finance', 'categories'] });
  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await refresh();
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    }
  };

  if (query.isPending) return <Loader />;
  if (query.isError) return <FormError error={query.error} />;
  const items = query.data;
  const move = (index: number, delta: -1 | 1) => {
    const ids = items.map((c) => c.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + delta, 0, moved!);
    void act(() => financeApi.reorderCategories(ids));
  };
  const remove = (c: FinanceCategory) =>
    modals.openConfirmModal({
      title: t('categories.deleteTitle', { name: categoryLabel(c) }),
      labels: { confirm: t('categories.delete'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: () => void act(() => financeApi.deleteCategory(c.id)),
    });

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="flex-start">
        <Text size="sm" c="dimmed" maw={600}>
          {t(`categories.hints.${kind}`)}
        </Text>
        <Button size="sm" leftSection={<IconPlus size={16} />} onClick={() => setEditing({ category: null })}>
          {t('categories.add')}
        </Button>
      </Group>
      <Card withBorder radius="lg" p={0}>
        {items.map((c, i) => (
          <Group
            key={c.id}
            justify="space-between"
            wrap="nowrap"
            px="md"
            py="sm"
            style={{ borderTop: i ? '1px solid var(--mantine-color-default-border)' : undefined }}
            opacity={c.isActive ? 1 : 0.55}
          >
            <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
              <Text size="sm" fw={500} truncate>
                {categoryLabel(c)}
              </Text>
              {c.systemKey && (
                <Badge size="xs" variant="default">
                  {t('categories.system')}
                </Badge>
              )}
            </Group>
            <Group gap={4} wrap="nowrap">
              <Switch
                size="sm"
                checked={c.isActive}
                aria-label={c.isActive ? t('categories.deactivate') : t('categories.activate')}
                onChange={(e) =>
                  void act(() => financeApi.updateCategory(c.id, { isActive: e.currentTarget.checked }))
                }
                mr="xs"
              />
              <ActionIcon
                variant="subtle"
                color="gray"
                disabled={i === 0}
                aria-label={t('categories.moveUp')}
                onClick={() => move(i, -1)}
                visibleFrom="xs"
              >
                <IconArrowUp size={16} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="gray"
                disabled={i === items.length - 1}
                aria-label={t('categories.moveDown')}
                onClick={() => move(i, 1)}
                visibleFrom="xs"
              >
                <IconArrowDown size={16} />
              </ActionIcon>
              <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                  <ActionIcon variant="subtle" color="gray" aria-label={t('common:actions.more')}>
                    <IconDots size={16} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconPencil size={16} />}
                    onClick={() => setEditing({ category: c })}
                  >
                    {t('categories.rename')}
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconArrowUp size={16} />}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    hiddenFrom="xs"
                  >
                    {t('categories.moveUp')}
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconArrowDown size={16} />}
                    disabled={i === items.length - 1}
                    onClick={() => move(i, 1)}
                    hiddenFrom="xs"
                  >
                    {t('categories.moveDown')}
                  </Menu.Item>
                  {!c.systemKey && (
                    <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={() => remove(c)}>
                      {t('categories.delete')}
                    </Menu.Item>
                  )}
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Group>
        ))}
      </Card>
      <ResponsiveModal
        opened={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.category ? t('categories.rename') : t('categories.add')}
        size="md"
      >
        {editing && (
          <CategoryForm
            kind={kind}
            category={editing.category}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              notifications.show({ color: 'teal', message: t('common:saved') });
              void refresh();
            }}
          />
        )}
      </ResponsiveModal>
    </Stack>
  );
}

function CategoriesPage() {
  const { t } = useTranslation('finance');
  const { kind = 'income' } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <>
      <PageHeader title={t('categories.title')} description={t('categories.description')} />
      <Tabs
        value={kind}
        onChange={(v) => void navigate({ search: { kind: (v ?? 'income') as CategoryKind }, replace: true })}
        keepMounted={false}
      >
        <Tabs.List mb="md">
          {CATEGORY_KINDS.map((k) => (
            <Tabs.Tab key={k} value={k}>
              {t(`categories.tabs.${k}`)}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {CATEGORY_KINDS.map((k) => (
          <Tabs.Panel key={k} value={k}>
            <KindPanel kind={k} />
          </Tabs.Panel>
        ))}
      </Tabs>
    </>
  );
}
