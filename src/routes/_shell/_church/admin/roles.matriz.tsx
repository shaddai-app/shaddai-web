import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Table,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconInfoCircle, IconLock } from '@tabler/icons-react';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useBlocker } from '@tanstack/react-router';
import { Fragment, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { rolesApi, type Grants, type PermissionModule, type Role } from '../../../../api/admin';
import { requirePermission } from '../../../../auth/guards';
import { can } from '../../../../auth/permissions';
import { meQuery } from '../../../../auth/session';
import { FormError } from '../../../../components/FormError';
import { diffCount, nextScope, type Cell } from '../../../../features/admin/matrix';
import classes from '../../../../features/admin/matrix.module.css';
import { errorMessage } from '../../../../i18n/errors';
import { PageHeader } from '../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/admin/roles/matriz')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'roles.ver'),
  component: MatrixPage,
});

function ScopeCell({
  value,
  locked,
  editable,
  label,
  onClick,
}: {
  value: Cell;
  locked: boolean;
  editable: boolean;
  label: string;
  onClick: () => void;
}) {
  const { t } = useTranslation('permissions');
  return (
    <UnstyledButton
      className={classes.cell}
      data-scope={value ?? 'none'}
      disabled={locked || !editable}
      onClick={onClick}
      aria-label={`${label}: ${value ? t(`scope.${value}`) : t('scope.none')}`}
    >
      {value ? t(`scope.${value}`) : '—'}
    </UnstyledButton>
  );
}

const initialDraft = (roles: Role[]): Record<number, Grants> =>
  Object.fromEntries(roles.map((r) => [r.id, { ...r.grants }]));

/**
 * Editor de la matriz. Se remonta (key) cada vez que llegan datos nuevos del servidor, así el
 * borrador arranca siempre desde lo guardado sin sincronizar estado en efectos.
 */
function MatrixEditor({
  modules,
  roles,
  editable,
}: {
  modules: PermissionModule[];
  roles: Role[];
  editable: boolean;
}) {
  const { t } = useTranslation(['admin', 'permissions', 'common']);
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(() => initialDraft(roles));
  const [saving, setSaving] = useState(false);

  const changes = useMemo(
    () =>
      roles
        .filter((r) => !r.isLocked)
        .map((r) => ({ id: r.id, count: diffCount(r.grants, draft[r.id] ?? {}) }))
        .filter((c) => c.count > 0),
    [roles, draft],
  );
  const changeCount = changes.reduce((n, c) => n + c.count, 0);

  useBlocker({
    shouldBlockFn: () => changeCount > 0 && !window.confirm(t('common:unsavedChanges')),
    enableBeforeUnload: () => changeCount > 0,
  });

  const toggle = (role: Role, key: string, supportsScope: boolean) =>
    setDraft((prev) => {
      const grants = { ...prev[role.id] };
      const next = nextScope(grants[key], supportsScope);
      if (next) grants[key] = next;
      else delete grants[key];
      return { ...prev, [role.id]: grants };
    });

  const save = async () => {
    setSaving(true);
    try {
      await rolesApi.saveMatrix(Object.fromEntries(changes.map((c) => [c.id, draft[c.id]!])));
      notifications.show({ color: 'teal', message: t('matrix.saved') });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['roles'] }),
        queryClient.invalidateQueries({ queryKey: ['me'] }), // mis permisos pueden haber cambiado
      ]);
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
      setSaving(false);
    }
  };

  return (
    <>
      <Card withBorder radius="lg" p={0}>
        <Table.ScrollContainer minWidth={220 + roles.length * 110} type="native">
          <Table className={classes.table} withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th className={classes.sticky}>{t('matrix.permission')}</Table.Th>
                {roles.map((r) => (
                  <Table.Th key={r.id} className={classes.roleHead}>
                    <Group gap={4} wrap="nowrap" justify="center">
                      {r.isLocked && (
                        <Tooltip label={t('matrix.lockedColumn')}>
                          <IconLock size={14} aria-label={t('matrix.lockedColumn')} />
                        </Tooltip>
                      )}
                      <Text size="xs" fw={600} ta="center" lineClamp={2}>
                        {r.name}
                      </Text>
                    </Group>
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {modules.map((mod) => (
                <Fragment key={mod.module}>
                  <Table.Tr className={classes.moduleRow}>
                    <Table.Td className={classes.sticky}>
                      <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                        {t(`permissions:modules.${mod.module}` as never)}
                      </Text>
                    </Table.Td>
                    <Table.Td colSpan={roles.length} />
                  </Table.Tr>
                  {mod.permissions.map((p) => {
                    const label = t(`permissions:actions.${mod.module}.${p.action}` as never) as string;
                    return (
                      <Table.Tr key={p.key}>
                        <Table.Td className={classes.sticky}>
                          <Text size="sm">{label}</Text>
                        </Table.Td>
                        {roles.map((r) => (
                          <Table.Td key={r.id} p={4}>
                            <ScopeCell
                              value={r.isLocked ? 'all' : draft[r.id]?.[p.key]}
                              locked={r.isLocked}
                              editable={editable}
                              label={`${r.name} · ${label}`}
                              onClick={() => toggle(r, p.key, p.supportsScope)}
                            />
                          </Table.Td>
                        ))}
                      </Table.Tr>
                    );
                  })}
                </Fragment>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      {editable && changeCount > 0 && (
        <Card withBorder shadow="md" radius="lg" className={classes.saveBar} p="sm">
          <Group justify="space-between" gap="sm">
            <Badge variant="light" color="orange" size="lg">
              {t('matrix.unsaved', { count: changeCount })}
            </Badge>
            <Group gap="xs">
              <Button variant="default" onClick={() => setDraft(initialDraft(roles))} disabled={saving}>
                {t('matrix.discard')}
              </Button>
              <Button onClick={() => void save()} loading={saving}>
                {t('matrix.save')}
              </Button>
            </Group>
          </Group>
        </Card>
      )}
    </>
  );
}

function MatrixPage() {
  const { t } = useTranslation(['admin', 'permissions', 'common']);
  const { data: me } = useSuspenseQuery(meQuery());
  const editable = can(me, 'roles.gestionar');
  const matrix = useQuery({ queryKey: ['roles', 'matrix'], queryFn: rolesApi.matrix });

  return (
    <>
      <PageHeader
        title={t('matrix.title')}
        description={editable ? t('matrix.description') : undefined}
        actions={
          <Anchor component={Link} to="/admin/roles" size="sm">
            {t('common:actions.back')}
          </Anchor>
        }
      />
      {!editable && (
        <Alert variant="light" mb="md" icon={<IconInfoCircle size={18} />}>
          {t('matrix.readOnly')}
        </Alert>
      )}
      <Text size="sm" c="dimmed" mb="md">
        {t('permissions:scopeHelp')}
      </Text>
      <FormError error={matrix.error} />
      {matrix.isPending ? (
        <Loader />
      ) : (
        matrix.data && (
          <MatrixEditor
            key={matrix.dataUpdatedAt}
            modules={matrix.data.modules}
            roles={matrix.data.roles}
            editable={editable}
          />
        )
      )}
    </>
  );
}
