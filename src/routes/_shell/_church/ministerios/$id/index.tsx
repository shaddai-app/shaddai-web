import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Menu,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconArrowDown,
  IconArrowUp,
  IconCalendarUser,
  IconCheck,
  IconDots,
  IconPencil,
  IconPlus,
  IconTrash,
  IconUserMinus,
  IconUserPlus,
  IconX,
} from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MEMBER_ROLES,
  ministriesApi,
  type MemberRole,
  type Ministry,
  type ServiceRole,
} from '../../../../../api/ministries';
import type { PersonListItem } from '../../../../../api/people';
import { requirePermission } from '../../../../../auth/guards';
import { FormError } from '../../../../../components/FormError';
import { AnchorLink, ButtonLink } from '../../../../../components/links';
import { KIND_ICONS, ministriesKey, ministryKey, moveItem } from '../../../../../features/ministries/common';
import { MinistryFormModal } from '../../../../../features/ministries/MinistryFormModal';
import { formatDate, fullName } from '../../../../../features/people/format';
import { PersonPicker } from '../../../../../features/people/PersonPicker';
import { errorMessage } from '../../../../../i18n/errors';
import { PageHeader } from '../../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/ministerios/$id/')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'ministerios.ver'),
  component: MinistryPage,
});

const ROLE_COLORS: Record<MemberRole, string> = { leader: 'blue', coleader: 'cyan', servant: 'gray' };

function RoleRow({
  role,
  index,
  total,
  canManage,
  run,
  onMove,
}: {
  role: ServiceRole;
  index: number;
  total: number;
  canManage: boolean;
  run: (action: () => Promise<Ministry>, message?: string) => Promise<void>;
  onMove: (delta: -1 | 1) => void;
}) {
  const { t } = useTranslation(['ministries', 'common']);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(role.name);
  const ministryId = Number(Route.useParams().id);

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          void run(() => ministriesApi.updateRole(ministryId, role.id, { name: name.trim() })).then(() =>
            setEditing(false),
          );
        }}
      >
        <Group gap="xs" wrap="nowrap">
          <TextInput
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            maxLength={80}
            size="sm"
            style={{ flex: 1 }}
            aria-label={t('roles.name')}
            autoFocus
          />
          <ActionIcon type="submit" variant="light" size="lg" aria-label={t('common:actions.save')}>
            <IconCheck size={16} />
          </ActionIcon>
          <ActionIcon
            variant="default"
            size="lg"
            onClick={() => {
              setName(role.name);
              setEditing(false);
            }}
            aria-label={t('common:actions.cancel')}
          >
            <IconX size={16} />
          </ActionIcon>
        </Group>
      </form>
    );
  }
  return (
    <Group justify="space-between" wrap="nowrap" gap="xs" py={4}>
      <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
        <Text size="sm" truncate c={role.isActive ? undefined : 'dimmed'}>
          {role.name}
        </Text>
        {!role.isActive && (
          <Badge size="xs" variant="light" color="gray">
            {t('inactive')}
          </Badge>
        )}
      </Group>
      {canManage && (
        <Group gap={2} wrap="nowrap">
          <ActionIcon
            variant="subtle"
            color="gray"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            aria-label={t('roles.up', { name: role.name })}
          >
            <IconArrowUp size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="gray"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            aria-label={t('roles.down', { name: role.name })}
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
              <Menu.Item leftSection={<IconPencil size={14} />} onClick={() => setEditing(true)}>
                {t('roles.rename')}
              </Menu.Item>
              <Menu.Item
                onClick={() =>
                  void run(() => ministriesApi.updateRole(ministryId, role.id, { isActive: !role.isActive }))
                }
              >
                {role.isActive ? t('roles.deactivate') : t('roles.activate')}
              </Menu.Item>
              <Menu.Item
                color="red"
                leftSection={<IconTrash size={14} />}
                onClick={() =>
                  modals.openConfirmModal({
                    title: t('roles.deleteTitle', { name: role.name }),
                    children: <Text size="sm">{t('roles.deleteBody')}</Text>,
                    labels: { confirm: t('roles.delete'), cancel: t('common:actions.cancel') },
                    confirmProps: { color: 'red' },
                    onConfirm: () => void run(() => ministriesApi.removeRole(ministryId, role.id)),
                  })
                }
              >
                {t('roles.delete')}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      )}
    </Group>
  );
}

function MinistryPage() {
  const { t } = useTranslation(['ministries', 'common']);
  const id = Number(Route.useParams().id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ministryKey(id), queryFn: () => ministriesApi.get(id) });
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState<PersonListItem | null>(null);
  const [addRole, setAddRole] = useState<MemberRole>('servant');
  const [newRole, setNewRole] = useState('');
  const [busy, setBusy] = useState(false);

  if (query.isPending) return <Loader />;
  if (query.isError) return <FormError error={query.error} />;
  const m = query.data;
  const Icon = KIND_ICONS[m.kind];

  const save = (saved: Ministry) => {
    queryClient.setQueryData(ministryKey(id), saved);
    void queryClient.invalidateQueries({ queryKey: [...ministriesKey, 'list'] });
  };
  /** Ejecuta una acción que devuelve el ministerio actualizado y avisa si falla. */
  const run = async (action: () => Promise<Ministry>, message?: string) => {
    setBusy(true);
    try {
      save(await action());
      if (message) notifications.show({ color: 'teal', message });
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
      throw err;
    } finally {
      setBusy(false);
    }
  };
  const quiet = (action: () => Promise<Ministry>, message?: string) =>
    run(action, message).catch(() => undefined);
  const roleOptions = MEMBER_ROLES.map((r) => ({
    value: r,
    label: t(`roles.member.${r}`),
    disabled: r === 'leader' && !m.canManageLeaders,
  }));
  const remove = () =>
    modals.openConfirmModal({
      title: t('deleteTitle', { name: m.name }),
      children: <Text size="sm">{t('deleteBody')}</Text>,
      labels: { confirm: t('delete'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await ministriesApi.remove(m.id);
          void queryClient.invalidateQueries({ queryKey: ministriesKey });
          void navigate({ to: '/ministerios' });
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  return (
    <>
      <PageHeader
        title={m.name}
        badge={
          <Group gap={6}>
            <Badge color={m.color ?? 'blue'} variant="light" leftSection={<Icon size={12} />}>
              {t(`kinds.${m.kind}`)}
            </Badge>
            {!m.isActive && (
              <Badge color="gray" variant="light">
                {t('inactive')}
              </Badge>
            )}
          </Group>
        }
        actions={
          <Group gap="xs">
            <ButtonLink
              to="/ministerios/$id/turnos"
              params={{ id: String(m.id) }}
              variant={m.canManage ? 'default' : 'filled'}
              leftSection={<IconCalendarUser size={18} />}
            >
              {t('schedule.open')}
            </ButtonLink>
            {m.canManage && (
              <Button leftSection={<IconPencil size={18} />} onClick={() => setEditing(true)}>
                {t('edit')}
              </Button>
            )}
            {m.canDelete && (
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
            )}
          </Group>
        }
      />
      <Stack gap="md" maw={1000}>
        {(m.description || m.campus) && (
          <Card withBorder radius="lg">
            {m.description && (
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                {m.description}
              </Text>
            )}
            {m.campus && (
              <Text size="sm" c="dimmed" mt={m.description ? 'xs' : 0}>
                {t('campus', { name: m.campus.name })}
              </Text>
            )}
          </Card>
        )}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <Card withBorder radius="lg">
            <Title order={3} size="h5" mb="sm">
              {t('members.title', { count: m.members.length })}
            </Title>
            {m.canManage && (
              <Stack gap="xs" mb="sm">
                <PersonPicker
                  aria-label={t('members.add')}
                  placeholder={t('members.searchToAdd')}
                  value={adding}
                  onChange={setAdding}
                  exclude={m.members.map((x) => x.person.id)}
                />
                <Group gap="xs" wrap="nowrap">
                  <Select
                    aria-label={t('members.role')}
                    data={roleOptions}
                    value={addRole}
                    onChange={(v) => v && setAddRole(v as MemberRole)}
                    allowDeselect={false}
                    style={{ flex: 1 }}
                  />
                  <Button
                    leftSection={<IconUserPlus size={16} />}
                    disabled={!adding}
                    loading={busy}
                    onClick={() =>
                      void quiet(
                        () => ministriesApi.addMember(m.id, { personId: adding!.id, role: addRole }),
                        t('members.added'),
                      ).then(() => {
                        setAdding(null);
                        setAddRole('servant');
                      })
                    }
                  >
                    {t('members.add')}
                  </Button>
                </Group>
              </Stack>
            )}
            {m.members.length === 0 ? (
              <Text size="sm" c="dimmed">
                {t('members.empty')}
              </Text>
            ) : (
              <Stack gap={0}>
                {m.members.map((x) => {
                  const locked = x.role === 'leader' && !m.canManageLeaders;
                  return (
                    <Group
                      key={x.id}
                      justify="space-between"
                      wrap="nowrap"
                      gap="xs"
                      py={6}
                      style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <AnchorLink
                          to="/personas/$id"
                          params={{ id: String(x.person.id) }}
                          size="sm"
                          fw={500}
                          truncate
                          display="block"
                        >
                          {fullName(x.person)}
                        </AnchorLink>
                        <Text size="xs" c="dimmed">
                          {t('members.since', { date: formatDate(x.joinedAt) })}
                        </Text>
                      </div>
                      {m.canManage && !locked ? (
                        <Group gap={4} wrap="nowrap">
                          <Select
                            size="xs"
                            w={130}
                            aria-label={t('members.roleOf', { name: fullName(x.person) })}
                            data={roleOptions}
                            value={x.role}
                            onChange={(v) =>
                              v &&
                              v !== x.role &&
                              void quiet(() => ministriesApi.setMemberRole(m.id, x.id, v as MemberRole))
                            }
                            allowDeselect={false}
                          />
                          <Tooltip label={t('members.remove')}>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              aria-label={t('members.removeName', { name: fullName(x.person) })}
                              onClick={() =>
                                modals.openConfirmModal({
                                  title: t('members.removeTitle', { name: fullName(x.person) }),
                                  children: <Text size="sm">{t('members.removeBody')}</Text>,
                                  labels: {
                                    confirm: t('members.remove'),
                                    cancel: t('common:actions.cancel'),
                                  },
                                  confirmProps: { color: 'red' },
                                  onConfirm: () =>
                                    void quiet(
                                      () => ministriesApi.removeMember(m.id, x.id),
                                      t('members.removed'),
                                    ),
                                })
                              }
                            >
                              <IconUserMinus size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      ) : (
                        <Badge variant="light" color={ROLE_COLORS[x.role]} style={{ flexShrink: 0 }}>
                          {t(`roles.member.${x.role}`)}
                        </Badge>
                      )}
                    </Group>
                  );
                })}
              </Stack>
            )}
          </Card>

          <Card withBorder radius="lg">
            <Title order={3} size="h5">
              {t('roles.title')}
            </Title>
            <Text size="xs" c="dimmed" mb="sm">
              {t('roles.hint')}
            </Text>
            {m.roles.length === 0 ? (
              <Text size="sm" c="dimmed" mb="sm">
                {t('roles.empty')}
              </Text>
            ) : (
              <Stack gap={0} mb="sm">
                {m.roles.map((r, i) => (
                  <RoleRow
                    key={r.id}
                    role={r}
                    index={i}
                    total={m.roles.length}
                    canManage={m.canManage}
                    run={run}
                    onMove={(delta) =>
                      void quiet(() =>
                        ministriesApi.reorderRoles(
                          m.id,
                          moveItem(m.roles, i, delta).map((x) => x.id),
                        ),
                      )
                    }
                  />
                ))}
              </Stack>
            )}
            {m.canManage && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newRole.trim()) return;
                  void quiet(() => ministriesApi.addRole(m.id, newRole.trim())).then(() => setNewRole(''));
                }}
              >
                <Group gap="xs" wrap="nowrap">
                  <TextInput
                    placeholder={t('roles.newPlaceholder')}
                    aria-label={t('roles.new')}
                    value={newRole}
                    onChange={(e) => setNewRole(e.currentTarget.value)}
                    maxLength={80}
                    style={{ flex: 1 }}
                  />
                  <Button
                    type="submit"
                    variant="light"
                    leftSection={<IconPlus size={16} />}
                    disabled={!newRole.trim()}
                  >
                    {t('roles.add')}
                  </Button>
                </Group>
              </form>
            )}
          </Card>
        </SimpleGrid>
      </Stack>
      <MinistryFormModal
        opened={editing}
        ministry={m}
        onClose={() => setEditing(false)}
        onSaved={(saved) => {
          setEditing(false);
          save(saved);
          notifications.show({ color: 'teal', message: t('common:saved') });
        }}
      />
    </>
  );
}
