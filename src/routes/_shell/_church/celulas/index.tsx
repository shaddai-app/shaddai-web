import {
  Button,
  Card,
  Group,
  Loader,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconBinaryTree2, IconMap, IconPlus, IconSearch, IconUsers } from '@tabler/icons-react';
import { keepPreviousData, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { CELL_STATUSES, cellsApi, type CellListItem } from '../../../../api/cells';
import { requirePermission } from '../../../../auth/guards';
import { can, scopeOf } from '../../../../auth/permissions';
import { meQuery } from '../../../../auth/session';
import { FormError } from '../../../../components/FormError';
import { AnchorLink, UnstyledLink } from '../../../../components/links';
import { PaginationBar } from '../../../../components/PaginationBar';
import { CellStatusBadge, ZoneLabel } from '../../../../features/cells/CellBits';
import { CellFormModal } from '../../../../features/cells/CellFormModal';
import {
  meetingLabel,
  networksQuery,
  useStructureLabels,
  zonesQuery,
} from '../../../../features/cells/structure';
import { fullName } from '../../../../features/people/format';
import { PageHeader } from '../../../../layout/PageHeader';

const search = z.object({
  page: z.number().int().min(1).optional(),
  q: z.string().optional(),
  networkId: z.number().int().optional(),
  zoneId: z.number().int().optional(),
  status: z.enum(CELL_STATUSES).optional(),
  mine: z.boolean().optional(),
});

export const Route = createFileRoute('/_shell/_church/celulas/')({
  validateSearch: search,
  beforeLoad: ({ context }) => requirePermission(context.me, 'celulas.ver'),
  component: CellsPage,
});

const PAGE_SIZE = 25;

function Leader({ cell }: { cell: CellListItem }) {
  return (
    <Stack gap={0}>
      <Text size="sm">{fullName(cell.leader)}</Text>
      {cell.leader.phone && (
        <Text size="xs" c="dimmed">
          {cell.leader.phone}
        </Text>
      )}
    </Stack>
  );
}

function CellsPage() {
  const { t } = useTranslation(['cells', 'common']);
  const params = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const { data: me } = useSuspenseQuery(meQuery());
  const labels = useStructureLabels();
  const networks = useQuery(networksQuery());
  const zones = useQuery(zonesQuery());
  const [q, setQ] = useState(params.q ?? '');
  const [formOpen, setFormOpen] = useState(false);

  const page = params.page ?? 1;
  const filters = {
    q: params.q,
    networkId: params.networkId,
    zoneId: params.zoneId,
    status: params.status,
    mine: params.mine,
  };
  const list = useQuery({
    queryKey: ['cells', 'list', { ...filters, page }],
    queryFn: () => cellsApi.list({ ...filters, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const setSearch = (patch: Partial<z.infer<typeof search>>) =>
    void navigate({ search: (prev) => ({ ...prev, page: undefined, ...patch }), replace: true });
  const debouncedQ = useDebouncedCallback((value: string) => setSearch({ q: value || undefined }), 350);
  const filtered = Boolean(params.q || params.networkId || params.zoneId || params.status || params.mine);
  const zoneOptions = (zones.data ?? [])
    .filter((z) => !params.networkId || z.network.id === params.networkId)
    .map((z) => ({ value: String(z.id), label: z.name }));
  const noStructure = zones.isSuccess && zones.data.length === 0;

  return (
    <>
      <PageHeader
        title={t('list.title')}
        description={t('list.description')}
        actions={
          <Group gap="xs">
            <Button
              variant="default"
              leftSection={<IconMap size={18} />}
              onClick={() => void navigate({ to: '/celulas/mapa' })}
            >
              {t('map.open')}
            </Button>
            <Button
              variant="default"
              leftSection={<IconBinaryTree2 size={18} />}
              onClick={() => void navigate({ to: '/celulas/genealogia' })}
            >
              {t('genealogy.open')}
            </Button>
            {can(me, 'celulas.crear') && (
              <Button
                leftSection={<IconPlus size={18} />}
                onClick={() => setFormOpen(true)}
                disabled={noStructure}
              >
                {t('list.add')}
              </Button>
            )}
          </Group>
        }
      />

      <Stack gap="md">
        {noStructure && (
          <Card withBorder radius="lg" padding="md">
            <Text size="sm">{t('list.noStructure', { network: labels.network, zone: labels.zone })}</Text>
            {can(me, 'estructura.gestionar') && (
              <AnchorLink to="/estructura/redes" size="sm" mt={4}>
                {t('list.goToStructure')}
              </AnchorLink>
            )}
          </Card>
        )}

        <Group gap="sm" align="flex-end" wrap="wrap">
          <TextInput
            leftSection={<IconSearch size={16} />}
            placeholder={t('list.search')}
            aria-label={t('list.search')}
            value={q}
            onChange={(e) => {
              setQ(e.currentTarget.value);
              debouncedQ(e.currentTarget.value);
            }}
            style={{ flex: '1 1 240px' }}
          />
          {(networks.data?.length ?? 0) > 1 && (
            <Select
              aria-label={labels.network}
              placeholder={t('list.all', { label: labels.network })}
              clearable
              data={(networks.data ?? []).map((n) => ({ value: String(n.id), label: n.name }))}
              value={params.networkId ? String(params.networkId) : null}
              onChange={(v) => setSearch({ networkId: v ? Number(v) : undefined, zoneId: undefined })}
              w={{ base: '100%', xs: 190 }}
            />
          )}
          {zoneOptions.length > 1 && (
            <Select
              aria-label={labels.zone}
              placeholder={t('list.all', { label: labels.zone })}
              clearable
              searchable
              data={zoneOptions}
              value={params.zoneId ? String(params.zoneId) : null}
              onChange={(v) => setSearch({ zoneId: v ? Number(v) : undefined })}
              w={{ base: '100%', xs: 190 }}
            />
          )}
          <Select
            aria-label={t('list.status')}
            placeholder={t('list.openStatuses')}
            clearable
            data={CELL_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))}
            value={params.status ?? null}
            onChange={(v) => setSearch({ status: (v as z.infer<typeof search>['status']) ?? undefined })}
            w={{ base: '100%', xs: 200 }}
          />
          {scopeOf(me, 'celulas.ver') === 'all' && (
            <SegmentedControl
              value={params.mine ? 'mine' : 'all'}
              onChange={(v) => setSearch({ mine: v === 'mine' || undefined })}
              data={[
                { value: 'all', label: t('list.allCells') },
                { value: 'mine', label: t('list.mine') },
              ]}
            />
          )}
        </Group>

        <FormError error={list.error} />

        {list.isPending ? (
          <Loader />
        ) : list.data && list.data.items.length === 0 ? (
          <Stack align="flex-start" gap="xs">
            <Text c="dimmed">{filtered ? t('list.emptyFiltered') : t('list.empty')}</Text>
            {filtered && (
              <Button
                variant="subtle"
                onClick={() => {
                  setQ('');
                  void navigate({ search: {}, replace: true });
                }}
              >
                {t('list.clearFilters')}
              </Button>
            )}
          </Stack>
        ) : (
          list.data && (
            <>
              <Text size="sm" c="dimmed">
                {t('list.total', { count: list.data.total })}
              </Text>

              {/* Escritorio: tabla */}
              <Card withBorder radius="lg" p={0} visibleFrom="sm">
                <Table.ScrollContainer minWidth={760}>
                  <Table verticalSpacing="sm" highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>{t('list.columns.name')}</Table.Th>
                        <Table.Th>{t('list.columns.meeting')}</Table.Th>
                        <Table.Th>{t('list.columns.leader')}</Table.Th>
                        <Table.Th ta="right">{t('list.columns.members')}</Table.Th>
                        <Table.Th>{t('list.columns.status')}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {list.data.items.map((c) => (
                        <Table.Tr
                          key={c.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => void navigate({ to: '/celulas/$id', params: { id: String(c.id) } })}
                        >
                          <Table.Td>
                            <AnchorLink
                              to="/celulas/$id"
                              params={{ id: String(c.id) }}
                              size="sm"
                              fw={500}
                              c="var(--mantine-color-text)"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {c.code ? `${c.code} · ${c.name}` : c.name}
                            </AnchorLink>
                            <ZoneLabel zone={c.zone} size="xs" />
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{meetingLabel(c.meetingDay, c.meetingTime)}</Text>
                            {c.neighborhood && (
                              <Text size="xs" c="dimmed">
                                {c.neighborhood}
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Leader cell={c} />
                          </Table.Td>
                          <Table.Td ta="right">{c.memberCount}</Table.Td>
                          <Table.Td>
                            <CellStatusBadge status={c.status} />
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              </Card>

              {/* Celular: tarjetas */}
              <Stack gap="xs" hiddenFrom="sm">
                {list.data.items.map((c) => (
                  <UnstyledLink key={c.id} to="/celulas/$id" params={{ id: String(c.id) }}>
                    <Card withBorder radius="lg" padding="sm">
                      <Stack gap={4}>
                        <Group justify="space-between" wrap="nowrap" gap="xs">
                          <Text fw={500} truncate>
                            {c.name}
                          </Text>
                          <CellStatusBadge status={c.status} size="xs" />
                        </Group>
                        <ZoneLabel zone={c.zone} size="xs" />
                        <Group justify="space-between" gap="xs" wrap="nowrap">
                          <Text size="xs" c="dimmed" truncate>
                            {meetingLabel(c.meetingDay, c.meetingTime)} · {fullName(c.leader)}
                          </Text>
                          <Group gap={4} wrap="nowrap">
                            <IconUsers size={14} stroke={1.6} />
                            <Text size="xs">{c.memberCount}</Text>
                          </Group>
                        </Group>
                      </Stack>
                    </Card>
                  </UnstyledLink>
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

      <CellFormModal
        opened={formOpen}
        cell={null}
        onClose={() => setFormOpen(false)}
        onSaved={(cell) => {
          setFormOpen(false);
          notifications.show({ color: 'teal', message: t('form.created') });
          void queryClient.invalidateQueries({ queryKey: ['cells'] });
          void navigate({ to: '/celulas/$id', params: { id: String(cell.id) } });
        }}
      />
    </>
  );
}
