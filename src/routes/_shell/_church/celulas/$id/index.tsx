import {
  ActionIcon,
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Menu,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconDots,
  IconPencil,
  IconPlayerPause,
  IconPlayerPlay,
  IconUserMinus,
  IconUserPlus,
  IconX,
  IconArrowsSplit,
} from '@tabler/icons-react';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Marker } from 'react-leaflet';
import { ApiError } from '../../../../../api/http';
import { cellsApi, type CellCore, type CellDetail, type CellPersonRef } from '../../../../../api/cells';
import type { PersonListItem } from '../../../../../api/people';
import { requirePermission } from '../../../../../auth/guards';
import { can } from '../../../../../auth/permissions';
import { meQuery } from '../../../../../auth/session';
import { cellDetailQuery, cellKey, cellReportsQuery } from '../../../../../features/cells/queries';
import { FormError } from '../../../../../components/FormError';
import { AnchorLink, ButtonLink, UnstyledLink } from '../../../../../components/links';
import { CellStatusBadge, ZoneLabel } from '../../../../../features/cells/CellBits';
import { CellFormModal } from '../../../../../features/cells/CellFormModal';
import { BaseMap } from '../../../../../features/cells/Map';
import { useBreakdown } from '../../../../../features/cells/use-breakdown';
import { usePinIcon } from '../../../../../features/cells/map-utils';
import { meetingLabel, useStructureLabels } from '../../../../../features/cells/structure';
import { formatDate, fullName } from '../../../../../features/people/format';
import { PersonAvatar, StatusBadge } from '../../../../../features/people/PersonBits';
import { PersonPicker } from '../../../../../features/people/PersonPicker';
import { errorMessage } from '../../../../../i18n/errors';
import { PageHeader } from '../../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/celulas/$id/')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'celulas.ver'),
  component: CellPage,
});

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <div>{children}</div>
    </div>
  );
}

function PersonLine({ person }: { person: CellPersonRef | null }) {
  if (!person) return <Text size="sm">—</Text>;
  return (
    <Stack gap={0}>
      <AnchorLink to="/personas/$id" params={{ id: String(person.id) }} size="sm">
        {fullName(person)}
      </AnchorLink>
      {person.phone && (
        <Anchor href={`tel:${person.phone}`} size="xs" c="dimmed">
          {person.phone}
        </Anchor>
      )}
    </Stack>
  );
}

function InfoCard({ cell }: { cell: CellDetail }) {
  const { t } = useTranslation('cells');
  const labels = useStructureLabels();
  const icon = usePinIcon(cell.zone.network.color);
  const place = [cell.address, cell.neighborhood, cell.city].filter(Boolean).join(', ');
  return (
    <Card withBorder radius="lg">
      <Stack gap="md">
        <SimpleGrid cols={2} spacing="md">
          <Field label={t('detail.meeting')}>
            <Text size="sm">{meetingLabel(cell.meetingDay, cell.meetingTime)}</Text>
          </Field>
          <Field label={`${labels.network} · ${labels.zone}`}>
            <ZoneLabel zone={cell.zone} truncate={false} />
          </Field>
          <Field label={t('form.leader')}>
            <PersonLine person={cell.leader} />
          </Field>
          <Field label={t('form.coLeader')}>
            <PersonLine person={cell.coLeader} />
          </Field>
          <Field label={t('form.host')}>
            <PersonLine person={cell.host} />
          </Field>
          {cell.campus && (
            <Field label={t('form.campus')}>
              <Text size="sm">{cell.campus.name}</Text>
            </Field>
          )}
          <Field label={t('form.startedAt')}>
            <Text size="sm">{formatDate(cell.startedAt) ?? '—'}</Text>
          </Field>
          {cell.parentCell && (
            <Field label={t('detail.parent')}>
              <AnchorLink to="/celulas/$id" params={{ id: String(cell.parentCell.id) }} size="sm">
                {cell.parentCell.name}
              </AnchorLink>
            </Field>
          )}
        </SimpleGrid>
        <Field label={t('form.location')}>
          <Text size="sm">{place || '—'}</Text>
          {!cell.access.address && (
            <Text size="xs" c="dimmed">
              {t('form.addressHidden')}
            </Text>
          )}
        </Field>
        {cell.lat != null && cell.lng != null && (
          <BaseMap center={{ lat: cell.lat, lng: cell.lng }} zoom={16} height={220} preview>
            <Marker position={[cell.lat, cell.lng]} icon={icon} />
          </BaseMap>
        )}
      </Stack>
    </Card>
  );
}

function GrowthCard({ cell, showLastReport }: { cell: CellDetail; showLastReport: boolean }) {
  const { t } = useTranslation('cells');
  const m = cell.multiplication;
  return (
    <Card withBorder radius="lg">
      <Stack gap="sm">
        <Group justify="space-between">
          <Title order={3} size="h5">
            {t('detail.growth')}
          </Title>
          {m.ready && (
            <Badge color="marfil" variant="light">
              {t('detail.ready')}
            </Badge>
          )}
        </Group>
        {m.ready && cell.access.multiply && cell.status === 'active' && (
          <ButtonLink
            to="/celulas/$id/multiplicar"
            params={{ id: String(cell.id) }}
            color="marfil"
            variant="light"
            leftSection={<IconArrowsSplit size={16} />}
          >
            {t('multiply.open')}
          </ButtonLink>
        )}
        <Progress
          value={m.progress}
          color={m.ready ? 'marfil' : 'teal'}
          size="lg"
          radius="xl"
          aria-label={t('detail.growth')}
        />
        <Text size="sm" c="dimmed">
          {t('detail.progress', { members: m.members, target: m.target })}
        </Text>
        {showLastReport && (
          <Text size="sm">
            {t('detail.lastReport')}:{' '}
            {cell.lastReport
              ? `${formatDate(cell.lastReport.meetingDate)}${cell.lastReport.held ? '' : ` (${t('detail.notHeld')})`}`
              : t('detail.noReports')}
          </Text>
        )}
        {cell.children.length > 0 && (
          <div>
            <Text size="xs" c="dimmed">
              {t('detail.children')}
            </Text>
            <Group gap="xs">
              {cell.children.map((c) => (
                <AnchorLink key={c.id} to="/celulas/$id" params={{ id: String(c.id) }} size="sm">
                  {c.name}
                </AnchorLink>
              ))}
            </Group>
          </div>
        )}
      </Stack>
    </Card>
  );
}

function MembersCard({ cell, onChange }: { cell: CellDetail; onChange: (c: CellCore) => void }) {
  const { t } = useTranslation(['cells', 'common']);
  const [adding, setAdding] = useState<PersonListItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const open = cell.status === 'active' || cell.status === 'paused';
  const canEdit = cell.access.edit && open;

  const add = async (person: PersonListItem, move = false) => {
    setBusy(true);
    setError(null);
    try {
      onChange(await cellsApi.addMember(cell.id, person.id, move));
      setAdding(null);
      notifications.show({ color: 'teal', message: t('members.added', { name: fullName(person) }) });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'PERSON_IN_OTHER_CELL' && !move) {
        const other = (err.details ?? {}) as { cellName?: string };
        modals.openConfirmModal({
          title: t('members.moveTitle'),
          children: (
            <Text size="sm">
              {t('members.moveBody', { name: fullName(person), cell: other.cellName ?? '' })}
            </Text>
          ),
          labels: { confirm: t('members.move'), cancel: t('common:actions.cancel') },
          onConfirm: () => void add(person, true),
        });
      } else setError(err);
    } finally {
      setBusy(false);
    }
  };

  const remove = (member: CellDetail['members'][number]) =>
    modals.openConfirmModal({
      title: t('members.removeTitle', { name: fullName(member) }),
      children: <Text size="sm">{t('members.removeBody')}</Text>,
      labels: { confirm: t('members.remove'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          onChange(await cellsApi.removeMember(cell.id, member.id));
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  const leaders = new Set([cell.leader.id, cell.coLeader?.id, cell.host?.id]);

  return (
    <Card withBorder radius="lg" p={0}>
      <Group justify="space-between" p="md" pb="sm">
        <Title order={3} size="h5">
          {t('members.title', { count: cell.members.length })}
        </Title>
      </Group>
      {canEdit && (
        <Stack gap="xs" px="md" pb="md">
          <FormError error={error} />
          <Group gap="xs" align="flex-end" wrap="nowrap">
            <PersonPicker
              style={{ flex: 1 }}
              aria-label={t('members.add')}
              placeholder={t('members.searchToAdd')}
              value={adding}
              onChange={setAdding}
              exclude={cell.members.map((m) => m.id)}
            />
            <Button
              leftSection={<IconUserPlus size={16} />}
              disabled={!adding}
              loading={busy}
              onClick={() => adding && void add(adding)}
            >
              {t('members.add')}
            </Button>
          </Group>
        </Stack>
      )}
      {cell.members.length === 0 ? (
        <Text c="dimmed" size="sm" px="md" pb="md">
          {t('members.empty')}
        </Text>
      ) : (
        cell.members.map((m) => (
          <Group
            key={m.id}
            justify="space-between"
            wrap="nowrap"
            px="md"
            py="sm"
            style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
          >
            <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
              <PersonAvatar person={m} size={36} />
              <div style={{ minWidth: 0 }}>
                <Group gap={6} wrap="nowrap">
                  <AnchorLink
                    to="/personas/$id"
                    params={{ id: String(m.id) }}
                    size="sm"
                    fw={500}
                    c="var(--mantine-color-text)"
                    truncate
                  >
                    {fullName(m)}
                  </AnchorLink>
                  {m.id === cell.leader.id && (
                    <Badge size="xs" variant="light">
                      {t('form.leader')}
                    </Badge>
                  )}
                </Group>
                <Text size="xs" c="dimmed" truncate>
                  {[m.phone, m.joinedAt && t('members.since', { date: formatDate(m.joinedAt) })]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </div>
            </Group>
            <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
              {m.status && <StatusBadge status={m.status} size="xs" />}
              {canEdit && !leaders.has(m.id) && (
                <Tooltip label={t('members.remove')}>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    aria-label={t('members.remove')}
                    onClick={() => remove(m)}
                  >
                    <IconUserMinus size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>
          </Group>
        ))
      )}
    </Card>
  );
}

function ReportsCard({ cell }: { cell: CellDetail }) {
  const { t } = useTranslation('cells');
  const reports = useQuery(cellReportsQuery(cell.id));
  const breakdown = useBreakdown();
  const open = cell.status === 'active' || cell.status === 'paused';
  return (
    <Card withBorder radius="lg" p={0}>
      <Group justify="space-between" p="md" pb="sm">
        <Title order={3} size="h5">
          {t('report.listTitle')}
        </Title>
        {cell.access.report && open && (
          <ButtonLink to="/celulas/$id/reportes/nuevo" params={{ id: String(cell.id) }} size="compact-sm">
            {t('myCell.loadReport')}
          </ButtonLink>
        )}
      </Group>
      {reports.isPending ? (
        <Loader size="sm" m="md" />
      ) : reports.isError ? (
        <Text size="sm" c="dimmed" px="md" pb="md">
          {errorMessage(reports.error)}
        </Text>
      ) : reports.data.items.length === 0 ? (
        <Text size="sm" c="dimmed" px="md" pb="md">
          {t('detail.noReports')}
        </Text>
      ) : (
        reports.data.items.map((r) => (
          <UnstyledLink
            key={r.id}
            to="/celulas/$id/reportes/$reportId"
            params={{ id: String(cell.id), reportId: String(r.id) }}
            px="md"
            py="sm"
            style={{ display: 'block', borderTop: '1px solid var(--mantine-color-default-border)' }}
          >
            <Group justify="space-between" wrap="nowrap">
              <Text size="sm">{formatDate(r.meetingDate)}</Text>
              {r.held ? (
                <Text size="sm" c="dimmed">
                  {breakdown(r.totals)}
                </Text>
              ) : (
                <Badge variant="light" color="gray" size="sm">
                  {t('report.notHeld')}
                </Badge>
              )}
            </Group>
          </UnstyledLink>
        ))
      )}
    </Card>
  );
}

function CellPage() {
  const { t } = useTranslation(['cells', 'common']);
  const id = Number(Route.useParams().id);
  const queryClient = useQueryClient();
  const { data: me } = useSuspenseQuery(meQuery());
  const query = useQuery(cellDetailQuery(id, me.user.id));
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();

  // Las mutaciones devuelven la célula sin progreso ni último reporte: se muestra al instante lo
  // nuevo sobre lo que había y se vuelve a pedir la ficha completa.
  const update = (cell: CellCore) => {
    queryClient.setQueryData<CellDetail>(cellKey(id), (prev) => (prev ? { ...prev, ...cell } : prev));
    void queryClient.invalidateQueries({ queryKey: cellKey(id) });
    void queryClient.invalidateQueries({ queryKey: ['cells', 'list'] });
    void queryClient.invalidateQueries({ queryKey: ['cells', 'map'] });
    void queryClient.invalidateQueries({ queryKey: ['zones'] });
  };

  const setStatus = async (status: 'active' | 'paused') => {
    try {
      update(await cellsApi.update(id, { status }));
      notifications.show({
        color: 'teal',
        message: t(status === 'paused' ? 'detail.paused' : 'detail.activated'),
      });
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    }
  };

  const close = (cell: CellDetail) =>
    modals.openConfirmModal({
      title: t('detail.closeTitle', { name: cell.name }),
      children: <Text size="sm">{t('detail.closeBody')}</Text>,
      labels: { confirm: t('detail.close'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          update(await cellsApi.close(id));
          notifications.show({ color: 'teal', message: t('detail.closed') });
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  if (query.isPending) return <Loader />;
  if (query.isError) return <FormError error={query.error} />;
  const cell = query.data;
  const open = cell.status === 'active' || cell.status === 'paused';
  const canMultiply = cell.access.multiply && cell.status === 'active';
  const statusActions = open && (cell.access.edit || cell.access.close || canMultiply);
  const canSeeReports = can(me, 'celulas.ver_reportes');

  return (
    <>
      <PageHeader
        back={{ to: '/celulas' }}
        title={cell.code ? `${cell.code} · ${cell.name}` : cell.name}
        badge={<CellStatusBadge status={cell.status} />}
        actions={
          <Group gap="xs">
            {cell.access.edit && open && (
              <Button leftSection={<IconPencil size={18} />} onClick={() => setEditing(true)}>
                {t('detail.edit')}
              </Button>
            )}
            {statusActions && (
              <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                  <ActionIcon variant="default" size="lg" aria-label={t('common:actions.more')}>
                    <IconDots size={18} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  {canMultiply && (
                    <Menu.Item
                      leftSection={<IconArrowsSplit size={16} />}
                      onClick={() =>
                        void navigate({ to: '/celulas/$id/multiplicar', params: { id: String(cell.id) } })
                      }
                    >
                      {t('multiply.open')}
                    </Menu.Item>
                  )}
                  {cell.access.edit &&
                    (cell.status === 'active' ? (
                      <Menu.Item
                        leftSection={<IconPlayerPause size={16} />}
                        onClick={() => void setStatus('paused')}
                      >
                        {t('detail.pause')}
                      </Menu.Item>
                    ) : (
                      <Menu.Item
                        leftSection={<IconPlayerPlay size={16} />}
                        onClick={() => void setStatus('active')}
                      >
                        {t('detail.activate')}
                      </Menu.Item>
                    ))}
                  {cell.access.close && (
                    <Menu.Item color="red" leftSection={<IconX size={16} />} onClick={() => close(cell)}>
                      {t('detail.close')}
                    </Menu.Item>
                  )}
                </Menu.Dropdown>
              </Menu>
            )}
          </Group>
        }
      />
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Stack gap="md">
          <InfoCard cell={cell} />
          <GrowthCard cell={cell} showLastReport={!canSeeReports} />
        </Stack>
        <Stack gap="md">
          <MembersCard cell={cell} onChange={update} />
          {canSeeReports && <ReportsCard cell={cell} />}
        </Stack>
      </SimpleGrid>
      <CellFormModal
        opened={editing}
        cell={cell}
        onClose={() => setEditing(false)}
        onSaved={(c) => {
          setEditing(false);
          update(c);
          notifications.show({ color: 'teal', message: t('form.saved') });
        }}
      />
    </>
  );
}
