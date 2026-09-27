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
  Textarea,
  TextInput,
} from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconDots, IconLock, IconPencil, IconPlus, IconTable, IconTrash } from '@tabler/icons-react';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { rolesApi, type Role } from '../../../../api/admin';
import { requirePermission } from '../../../../auth/guards';
import { can } from '../../../../auth/permissions';
import { meQuery } from '../../../../auth/session';
import { FormError } from '../../../../components/FormError';
import { ResponsiveModal } from '../../../../components/ResponsiveModal';
import { errorMessage } from '../../../../i18n/errors';
import { PageHeader } from '../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/admin/roles/')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'roles.ver'),
  component: RolesPage,
});

const schema = z.object({
  name: z.string().trim().min(2, 'required').max(80),
  description: z.string().trim().max(250),
  copyFrom: z.string(),
});
type Values = z.infer<typeof schema>;

type RoleFormProps = { role: Role | null; roles: Role[]; onClose: () => void; onSaved: () => void };

// Contenido del modal: se monta al abrir, así cada apertura arranca limpia.
function RoleForm({ role, roles, onClose, onSaved }: RoleFormProps) {
  const { t } = useTranslation(['admin', 'common', 'errors']);
  const [error, setError] = useState<unknown>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: role?.name ?? '', description: role?.description ?? '', copyFrom: '' },
  });

  const submit = form.handleSubmit(async (v) => {
    setError(null);
    try {
      const body = { name: v.name, description: v.description || null };
      if (role) {
        await rolesApi.update(role.id, body);
      } else {
        const source = roles.find((r) => String(r.id) === v.copyFrom);
        await rolesApi.create({ ...body, grants: source && !source.isLocked ? source.grants : {} });
      }
      notifications.show({ color: 'teal', message: t('roles.saved') });
      onSaved();
    } catch (err) {
      setError(err);
    }
  });

  const nameError = form.formState.errors.name?.message;

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap="md">
        <FormError error={error} />
        <TextInput
          label={t('roles.form.name')}
          data-autofocus
          error={nameError ? t(`errors:validation.${nameError}` as never) : undefined}
          {...form.register('name')}
        />
        <Textarea
          label={t('roles.form.description')}
          autosize
          minRows={2}
          {...form.register('description')}
        />
        {!role && (
          <Controller
            control={form.control}
            name="copyFrom"
            render={({ field }) => (
              <Select
                label={t('roles.form.copyFrom')}
                description={t('roles.form.permissionsHint')}
                data={[
                  { value: '', label: t('roles.form.copyNone') },
                  ...roles.filter((r) => !r.isLocked).map((r) => ({ value: String(r.id), label: r.name })),
                ]}
                value={field.value}
                onChange={(v) => field.onChange(v ?? '')}
                allowDeselect={false}
              />
            )}
          />
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={form.formState.isSubmitting}>
            {t('common:actions.save')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

function RoleFormModal({ opened, ...props }: RoleFormProps & { opened: boolean }) {
  const { t } = useTranslation('admin');
  return (
    <ResponsiveModal
      opened={opened}
      onClose={props.onClose}
      size="md"
      title={props.role ? t('roles.form.editTitle') : t('roles.form.createTitle')}
    >
      <RoleForm key={props.role?.id ?? 'new'} {...props} />
    </ResponsiveModal>
  );
}

function RolesPage() {
  const { t } = useTranslation(['admin', 'common']);
  const queryClient = useQueryClient();
  const { data: me } = useSuspenseQuery(meQuery());
  const canManage = can(me, 'roles.gestionar');
  const roles = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list });
  const [editing, setEditing] = useState<Role | null>(null);
  const [open, setOpen] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['roles'] });

  const remove = (role: Role) =>
    modals.openConfirmModal({
      title: t('roles.deleteTitle', { name: role.name }),
      children: <Text size="sm">{t('roles.deleteBody')}</Text>,
      labels: { confirm: t('roles.delete'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await rolesApi.remove(role.id);
          notifications.show({ color: 'teal', message: t('roles.deleted') });
          await refresh();
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  return (
    <>
      <PageHeader
        title={t('roles.title')}
        description={t('roles.description')}
        actions={
          <Group gap="sm">
            <Button
              component={Link}
              to="/admin/roles/matriz"
              variant="light"
              leftSection={<IconTable size={18} />}
            >
              {t('roles.matrix')}
            </Button>
            {canManage && (
              <Button
                leftSection={<IconPlus size={18} />}
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                {t('roles.add')}
              </Button>
            )}
          </Group>
        }
      />
      <FormError error={roles.error} />
      {roles.isPending ? (
        <Loader />
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {roles.data?.items.map((role) => (
            <Card key={role.id} withBorder radius="lg" padding="lg">
              <Group justify="space-between" wrap="nowrap" align="flex-start">
                <Group gap="xs" wrap="nowrap" miw={0}>
                  {role.isLocked && <IconLock size={16} aria-hidden />}
                  <Text fw={600} truncate>
                    {role.name}
                  </Text>
                </Group>
                {canManage && !role.isLocked && (
                  <Menu position="bottom-end" withinPortal>
                    <Menu.Target>
                      <ActionIcon aria-label={t('users.actions.label')}>
                        <IconDots size={18} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconPencil size={16} />}
                        onClick={() => {
                          setEditing(role);
                          setOpen(true);
                        }}
                      >
                        {t('roles.edit')}
                      </Menu.Item>
                      <Menu.Item
                        color="red"
                        leftSection={<IconTrash size={16} />}
                        onClick={() => remove(role)}
                      >
                        {t('roles.delete')}
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                )}
              </Group>
              <Text size="sm" c="dimmed" mt={6} lineClamp={3}>
                {role.isLocked ? t('roles.locked') : role.description}
              </Text>
              <Group gap="xs" mt="md">
                <Badge variant="light" color="gray">
                  {t('roles.userCount', { count: role.userCount })}
                </Badge>
                <Badge variant="light">
                  {t('roles.permissionCount', { count: Object.keys(role.grants).length })}
                </Badge>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      )}
      <RoleFormModal
        opened={open}
        role={editing}
        roles={roles.data?.items ?? []}
        onClose={() => setOpen(false)}
        onSaved={() => {
          setOpen(false);
          void refresh();
        }}
      />
    </>
  );
}
