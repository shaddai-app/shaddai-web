import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Menu,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconDots,
  IconKey,
  IconLockOpen,
  IconPencil,
  IconPlus,
  IconSearch,
  IconUserCheck,
  IconUserOff,
} from '@tabler/icons-react';
import { keepPreviousData, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { rolesApi, usersApi, type AccountUser, type UserInput } from '../../../../api/admin';
import { requirePermission } from '../../../../auth/guards';
import { can } from '../../../../auth/permissions';
import { meQuery } from '../../../../auth/session';
import { FormError } from '../../../../components/FormError';
import { PaginationBar } from '../../../../components/PaginationBar';
import { showTemporaryAccess } from '../../../../components/TemporaryAccess';
import { UserFormModal } from '../../../../features/admin/UserFormModal';
import { errorMessage } from '../../../../i18n/errors';
import { PageHeader } from '../../../../layout/PageHeader';

const search = z.object({
  page: z.number().int().min(1).optional(),
  q: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  roleId: z.number().int().optional(),
});

export const Route = createFileRoute('/_shell/_church/admin/usuarios')({
  validateSearch: search,
  beforeLoad: ({ context }) => requirePermission(context.me, 'usuarios.ver'),
  component: UsersPage,
});

const PAGE_SIZE = 20;

function StatusBadges({ user }: { user: AccountUser }) {
  const { t } = useTranslation('admin');
  return (
    <Group gap={4}>
      {!user.isActive && (
        <Badge color="gray" variant="light">
          {t('users.badges.inactive')}
        </Badge>
      )}
      {user.locked && (
        <Badge color="red" variant="light">
          {t('users.badges.locked')}
        </Badge>
      )}
      {user.isActive && user.mustChangePassword && (
        <Badge color="yellow" variant="light">
          {t('users.badges.pendingPassword')}
        </Badge>
      )}
      {user.isActive && !user.locked && !user.mustChangePassword && (
        <Badge color="teal" variant="light">
          {t('users.badges.active')}
        </Badge>
      )}
    </Group>
  );
}

function RoleBadges({ user }: { user: AccountUser }) {
  const { t } = useTranslation('admin');
  return (
    <Group gap={4}>
      {user.isAccountOwner && <Badge variant="filled">{t('users.badges.owner')}</Badge>}
      {user.roles.map((r) => (
        <Badge key={r.id} variant="outline" color={r.isLocked ? undefined : 'gray'}>
          {r.name}
        </Badge>
      ))}
    </Group>
  );
}

function UsersPage() {
  const { t } = useTranslation(['admin', 'common']);
  const params = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const { data: me } = useSuspenseQuery(meQuery());
  const canManage = can(me, 'usuarios.gestionar');
  const canReset = can(me, 'usuarios.resetear');
  const [editing, setEditing] = useState<AccountUser | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [q, setQ] = useState(params.q ?? '');

  const page = params.page ?? 1;
  const list = useQuery({
    queryKey: ['users', { ...params, page }],
    queryFn: () => usersApi.list({ ...params, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
  const roles = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list });

  const setSearch = (patch: Partial<z.infer<typeof search>>) =>
    void navigate({ search: (prev) => ({ ...prev, page: undefined, ...patch }), replace: true });
  const debouncedQ = useDebouncedCallback((value: string) => setSearch({ q: value || undefined }), 350);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['users'] });
  const act = async (fn: () => Promise<unknown>, success: string) => {
    try {
      await fn();
      notifications.show({ color: 'teal', message: success });
      await refresh();
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    }
  };

  const fullName = (u: AccountUser) => `${u.firstName} ${u.lastName}`;

  const deactivate = (u: AccountUser) =>
    modals.openConfirmModal({
      title: t('users.confirm.deactivateTitle', { name: fullName(u) }),
      children: <Text size="sm">{t('users.confirm.deactivateBody')}</Text>,
      labels: { confirm: t('users.actions.deactivate'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: () => void act(() => usersApi.deactivate(u.id), t('users.deactivated')),
    });

  const resetPassword = (u: AccountUser) =>
    modals.openConfirmModal({
      title: t('users.confirm.resetTitle', { name: fullName(u) }),
      children: <Text size="sm">{t('users.confirm.resetBody')}</Text>,
      labels: { confirm: t('users.actions.resetPassword'), cancel: t('common:actions.cancel') },
      onConfirm: async () => {
        try {
          const res = await usersApi.resetPassword(u.id, false);
          showTemporaryAccess({
            title: t('users.access.resetTitle'),
            name: fullName(u),
            email: u.email,
            password: res.temporaryPassword,
          });
          await refresh();
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  const saveUser = async (values: UserInput) => {
    if (editing) {
      const { email: _e, sendAccessEmail: _s, ...rest } = values;
      await usersApi.update(editing.id, rest);
      notifications.show({ color: 'teal', message: t('users.saved') });
    } else {
      const res = await usersApi.create(values);
      showTemporaryAccess({
        title: t('users.access.title'),
        name: fullName(res.user),
        email: res.user.email,
        password: res.temporaryPassword,
      });
    }
    setFormOpen(false);
    await refresh();
    // Mis propios roles pueden haber cambiado.
    if (editing?.id === me.user.id) await queryClient.invalidateQueries({ queryKey: ['me'] });
  };

  const usage = list.data?.usage;
  const full = usage ? usage.activeUsers >= usage.userLimit : false;

  const actionsMenu = (u: AccountUser) => {
    if (!canManage && !canReset) return null;
    return (
      <Menu position="bottom-end" withinPortal>
        <Menu.Target>
          <ActionIcon aria-label={t('users.actions.label')}>
            <IconDots size={18} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          {canManage && (
            <Menu.Item
              leftSection={<IconPencil size={16} />}
              onClick={() => {
                setEditing(u);
                setFormOpen(true);
              }}
            >
              {t('users.actions.edit')}
            </Menu.Item>
          )}
          {canManage && u.locked && (
            <Menu.Item
              leftSection={<IconLockOpen size={16} />}
              onClick={() => void act(() => usersApi.unlock(u.id), t('users.unlocked'))}
            >
              {t('users.actions.unlock')}
            </Menu.Item>
          )}
          {canReset && u.isActive && u.id !== me.user.id && (
            <Menu.Item leftSection={<IconKey size={16} />} onClick={() => resetPassword(u)}>
              {t('users.actions.resetPassword')}
            </Menu.Item>
          )}
          {canManage && u.id !== me.user.id && !u.isAccountOwner && (
            <>
              <Menu.Divider />
              {u.isActive ? (
                <Menu.Item color="red" leftSection={<IconUserOff size={16} />} onClick={() => deactivate(u)}>
                  {t('users.actions.deactivate')}
                </Menu.Item>
              ) : (
                <Menu.Item
                  leftSection={<IconUserCheck size={16} />}
                  onClick={() => void act(() => usersApi.activate(u.id), t('users.activated'))}
                >
                  {t('users.actions.activate')}
                </Menu.Item>
              )}
            </>
          )}
        </Menu.Dropdown>
      </Menu>
    );
  };

  const lastLogin = (u: AccountUser) =>
    u.lastLoginAt ? dayjs(u.lastLoginAt).format('L LT') : t('users.never');

  return (
    <>
      <PageHeader
        title={t('users.title')}
        description={t('users.description')}
        actions={
          canManage && (
            <Button
              leftSection={<IconPlus size={18} />}
              disabled={full}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              {t('users.add')}
            </Button>
          )
        }
      />

      <Stack gap="md">
        {usage && (
          <Group gap="xs">
            <Badge size="lg" variant="light" color={full ? 'orange' : undefined}>
              {t('users.usage', { active: usage.activeUsers, limit: usage.userLimit })}
            </Badge>
          </Group>
        )}
        {full && canManage && (
          <Alert color="orange" variant="light">
            {t('users.limitReached')}
          </Alert>
        )}

        <Group gap="sm" align="flex-end" wrap="wrap">
          <TextInput
            leftSection={<IconSearch size={16} />}
            placeholder={t('users.search')}
            aria-label={t('users.search')}
            value={q}
            onChange={(e) => {
              setQ(e.currentTarget.value);
              debouncedQ(e.currentTarget.value);
            }}
            style={{ flex: '1 1 220px' }}
          />
          <SegmentedControl
            value={params.status ?? 'all'}
            onChange={(v) => setSearch({ status: v === 'all' ? undefined : (v as 'active' | 'inactive') })}
            data={(['all', 'active', 'inactive'] as const).map((v) => ({
              value: v,
              label: t(`users.status.${v}`),
            }))}
          />
          <Select
            aria-label={t('users.role')}
            placeholder={t('users.allRoles')}
            clearable
            data={(roles.data?.items ?? []).map((r) => ({ value: String(r.id), label: r.name }))}
            value={params.roleId ? String(params.roleId) : null}
            onChange={(v) => setSearch({ roleId: v ? Number(v) : undefined })}
            w={{ base: '100%', xs: 220 }}
          />
        </Group>

        <FormError error={list.error} />

        {list.isPending ? (
          <Loader />
        ) : list.data && list.data.items.length === 0 ? (
          <Text c="dimmed">{t('users.empty')}</Text>
        ) : (
          list.data && (
            <>
              {/* Escritorio: tabla */}
              <Card withBorder radius="lg" p={0} visibleFrom="sm">
                <Table.ScrollContainer minWidth={720}>
                  <Table verticalSpacing="sm" highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>{t('users.columns.name')}</Table.Th>
                        <Table.Th>{t('users.columns.roles')}</Table.Th>
                        <Table.Th>{t('users.columns.status')}</Table.Th>
                        <Table.Th>{t('users.columns.lastLogin')}</Table.Th>
                        <Table.Th w={48} />
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {list.data.items.map((u) => (
                        <Table.Tr key={u.id} opacity={u.isActive ? 1 : 0.6}>
                          <Table.Td>
                            <Text size="sm" fw={500}>
                              {fullName(u)}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {u.email}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <RoleBadges user={u} />
                          </Table.Td>
                          <Table.Td>
                            <StatusBadges user={u} />
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{lastLogin(u)}</Text>
                          </Table.Td>
                          <Table.Td>{actionsMenu(u)}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              </Card>

              {/* Celular: tarjetas */}
              <Stack gap="sm" hiddenFrom="sm">
                {list.data.items.map((u) => (
                  <Card key={u.id} withBorder radius="lg" padding="md" opacity={u.isActive ? 1 : 0.6}>
                    <Group justify="space-between" wrap="nowrap" align="flex-start">
                      <div style={{ minWidth: 0 }}>
                        <Text fw={500} truncate>
                          {fullName(u)}
                        </Text>
                        <Text size="xs" c="dimmed" truncate>
                          {u.email}
                        </Text>
                      </div>
                      {actionsMenu(u)}
                    </Group>
                    <Stack gap={6} mt="sm">
                      <RoleBadges user={u} />
                      <StatusBadges user={u} />
                      <Text size="xs" c="dimmed">
                        {t('users.columns.lastLogin')}: {lastLogin(u)}
                      </Text>
                    </Stack>
                  </Card>
                ))}
              </Stack>

              <PaginationBar
                page={page}
                pageSize={PAGE_SIZE}
                total={list.data.total}
                onChange={(p) => void navigate({ search: (prev) => ({ ...prev, page: p }) })}
              />
            </>
          )
        )}
      </Stack>

      <UserFormModal
        opened={formOpen}
        user={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={saveUser}
      />
    </>
  );
}
