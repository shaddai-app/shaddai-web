import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  Loader,
  ScrollArea,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
} from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import { keepPreviousData, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { casesApi, type Board, type CaseCard, type ConsolidationStep } from '../../../../api/consolidation';
import { requirePermission } from '../../../../auth/guards';
import { can, scopeOf } from '../../../../auth/permissions';
import { meQuery } from '../../../../auth/session';
import { FormError } from '../../../../components/FormError';
import { AnchorLink } from '../../../../components/links';
import { PaginationBar } from '../../../../components/PaginationBar';
import { CaseStatusBadge } from '../../../../features/consolidation/CaseBits';
import { CaseCardView } from '../../../../features/consolidation/CaseCardView';
import { OpenCaseModal } from '../../../../features/consolidation/OpenCaseModal';
import { consolidatorsQuery, useStepLabel } from '../../../../features/consolidation/steps';
import { formatDate, fullName } from '../../../../features/people/format';
import { errorMessage } from '../../../../i18n/errors';
import { PageHeader } from '../../../../layout/PageHeader';

const search = z.object({
  view: z.enum(['board', 'closed']).optional(),
  filter: z.enum(['all', 'mine', 'unassigned']).optional(),
  consolidatorUserId: z.number().int().optional(),
  q: z.string().optional(),
  page: z.number().int().min(1).optional(),
});

export const Route = createFileRoute('/_shell/_church/consolidacion/')({
  validateSearch: search,
  beforeLoad: ({ context }) => requirePermission(context.me, 'consolidacion.ver'),
  component: ConsolidationPage,
});

function DraggableCard({ card, children }: { card: CaseCard; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id, data: { card } });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ opacity: isDragging ? 0.3 : 1, touchAction: 'manipulation' }}
    >
      {children}
    </div>
  );
}

function Column({
  step,
  title,
  count,
  children,
}: {
  step: ConsolidationStep | null;
  title: string;
  count: number;
  children: ReactNode;
}) {
  const { t } = useTranslation('consolidation');
  const { setNodeRef, isOver } = useDroppable({ id: step ? `step-${step.id}` : 'unplaced', data: { step } });
  return (
    <Box
      ref={setNodeRef}
      w={280}
      style={{
        flex: '0 0 280px',
        borderRadius: 'var(--mantine-radius-lg)',
        background: isOver ? 'var(--mantine-primary-color-light)' : 'var(--mantine-color-default-hover)',
        transition: 'background 120ms',
      }}
      p="xs"
    >
      <Group justify="space-between" px={4} mb="xs" wrap="nowrap">
        <Text size="sm" fw={600} truncate>
          {title}
        </Text>
        <Group gap={4} wrap="nowrap">
          {step && (
            <Text size="xs" c="dimmed">
              {t('board.dueDays', { count: step.dueDays })}
            </Text>
          )}
          <Badge size="sm" variant="default">
            {count}
          </Badge>
        </Group>
      </Group>
      <Stack gap="xs" mih={80}>
        {children}
      </Stack>
    </Box>
  );
}

function BoardView({
  canManage,
  filters,
}: {
  canManage: boolean;
  filters: Parameters<typeof casesApi.board>[0];
}) {
  const { t } = useTranslation('consolidation');
  const stepLabel = useStepLabel();
  const queryClient = useQueryClient();
  const key = ['consolidation', 'board', filters];
  const board = useQuery({
    queryKey: key,
    queryFn: () => casesApi.board(filters),
    placeholderData: keepPreviousData,
  });
  const [active, setActive] = useState<CaseCard | null>(null);
  // Con el dedo el arrastre arranca manteniendo apretado (así el tablero se puede desplazar).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const move = async (card: CaseCard, stepId: number) => {
    if (card.currentStepId === stepId) return;
    // Optimista: la tarjeta pasa de columna ya; si falla, se recarga el tablero.
    queryClient.setQueryData<Board>(
      key,
      (prev) =>
        prev && {
          ...prev,
          columns: prev.columns.map((c) => ({
            ...c,
            cases:
              c.step.id === stepId
                ? [...c.cases, { ...card, currentStepId: stepId }]
                : c.cases.filter((x) => x.id !== card.id),
          })),
          unplaced: prev.unplaced.filter((x) => x.id !== card.id),
        },
    );
    try {
      await casesApi.move(card.id, stepId);
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    } finally {
      void queryClient.invalidateQueries({ queryKey: ['consolidation'] });
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActive(null);
    const card = e.active.data.current?.card as CaseCard | undefined;
    const step = e.over?.data.current?.step as ConsolidationStep | null | undefined;
    if (card && step) void move(card, step.id);
  };

  if (board.isPending) return <Loader />;
  if (board.isError) return <FormError error={board.error} />;
  const { columns, unplaced, summary } = board.data;
  const steps = columns.map((c) => c.step);

  return (
    <Stack gap="sm">
      <Group gap="xs">
        <Badge variant="light" size="lg">
          {t('board.summary.open', { count: summary.open })}
        </Badge>
        <Badge variant="light" color="red" size="lg">
          {t('board.summary.overdue', { count: summary.overdue })}
        </Badge>
        <Badge variant="light" color="orange" size="lg">
          {t('board.summary.unassigned', { count: summary.unassigned })}
        </Badge>
      </Group>
      <DndContext
        sensors={sensors}
        onDragStart={(e) => setActive((e.active.data.current?.card as CaseCard | undefined) ?? null)}
        onDragCancel={() => setActive(null)}
        onDragEnd={onDragEnd}
      >
        <ScrollArea type="auto" offsetScrollbars scrollbarSize={8}>
          <Group align="flex-start" wrap="nowrap" gap="sm" pb="sm">
            {columns.map((col) => (
              <Column key={col.step.id} step={col.step} title={stepLabel(col.step)} count={col.cases.length}>
                {col.cases.length === 0 ? (
                  <Text size="xs" c="dimmed" ta="center" py="md">
                    {t('board.emptyColumn')}
                  </Text>
                ) : (
                  col.cases.map((card) =>
                    canManage ? (
                      <DraggableCard key={card.id} card={card}>
                        <CaseCardView card={card} steps={steps} onMove={(c, s) => void move(c, s)} />
                      </DraggableCard>
                    ) : (
                      <CaseCardView key={card.id} card={card} steps={steps} />
                    ),
                  )
                )}
              </Column>
            ))}
            {unplaced.length > 0 && (
              <Column step={null} title={t('board.unplaced')} count={unplaced.length}>
                {unplaced.map((card) => (
                  <CaseCardView
                    key={card.id}
                    card={card}
                    steps={steps}
                    onMove={canManage ? (c, s) => void move(c, s) : undefined}
                  />
                ))}
              </Column>
            )}
          </Group>
        </ScrollArea>
        <DragOverlay>{active && <CaseCardView card={active} steps={steps} dragging />}</DragOverlay>
      </DndContext>
      {canManage && (
        <Text size="xs" c="dimmed">
          {t('board.dragHint')}
        </Text>
      )}
    </Stack>
  );
}

function ClosedView({
  filters,
  q,
  page,
}: {
  filters: Parameters<typeof casesApi.board>[0];
  q?: string;
  page: number;
}) {
  const { t } = useTranslation('consolidation');
  const navigate = useNavigate({ from: Route.fullPath });
  const [status, setStatus] = useState<'completed' | 'dropped'>('completed');
  const [text, setText] = useState(q ?? '');
  const debounced = useDebouncedCallback(
    (v: string) =>
      void navigate({ search: (prev) => ({ ...prev, q: v || undefined, page: undefined }), replace: true }),
    350,
  );
  const PAGE_SIZE = 25;
  const list = useQuery({
    queryKey: ['consolidation', 'cases', { ...filters, status, q, page }],
    queryFn: () => casesApi.list({ ...filters, status, q, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
  return (
    <Stack gap="sm">
      <Group gap="sm" wrap="wrap">
        <TextInput
          leftSection={<IconSearch size={16} />}
          placeholder={t('cases.search')}
          aria-label={t('cases.search')}
          value={text}
          onChange={(e) => {
            setText(e.currentTarget.value);
            debounced(e.currentTarget.value);
          }}
          style={{ flex: '1 1 240px' }}
        />
        <SegmentedControl
          value={status}
          onChange={(v) => setStatus(v as 'completed' | 'dropped')}
          data={(['completed', 'dropped'] as const).map((s) => ({ value: s, label: t(`status.${s}`) }))}
        />
      </Group>
      <FormError error={list.error} />
      {list.isPending ? (
        <Loader />
      ) : !list.data ? null : list.data.items.length === 0 ? (
        <Text c="dimmed">{t('cases.empty')}</Text>
      ) : (
        <>
          <Card withBorder radius="lg" p={0}>
            <Table.ScrollContainer minWidth={520}>
              <Table verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('cases.person')}</Table.Th>
                    <Table.Th>{t('cases.consolidator')}</Table.Th>
                    <Table.Th>{t('cases.closedAt')}</Table.Th>
                    <Table.Th>{t('cases.status')}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {list.data.items.map((c) => (
                    <Table.Tr key={c.id}>
                      <Table.Td>
                        <AnchorLink
                          to="/consolidacion/$caseId"
                          params={{ caseId: String(c.id) }}
                          size="sm"
                          fw={500}
                        >
                          {fullName(c.person)}
                        </AnchorLink>
                        {c.closeReason && (
                          <Text size="xs" c="dimmed" truncate maw={260}>
                            {t(`closeReasons.${c.closeReason}`, { defaultValue: c.closeReason })}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>{c.consolidator ? fullName(c.consolidator) : '—'}</Table.Td>
                      <Table.Td>{formatDate(c.closedAt) ?? '—'}</Table.Td>
                      <Table.Td>
                        <CaseStatusBadge status={c.status} size="sm" />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Card>
          <PaginationBar
            page={page}
            pageSize={PAGE_SIZE}
            total={list.data.total}
            onChange={(p) => void navigate({ search: (prev) => ({ ...prev, page: p }) })}
          />
        </>
      )}
    </Stack>
  );
}

function ConsolidationPage() {
  const { t } = useTranslation('consolidation');
  const params = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const { data: me } = useSuspenseQuery(meQuery());
  const [opening, setOpening] = useState(false);
  const canAssign = can(me, 'consolidacion.asignar');
  const canManage = can(me, 'consolidacion.gestionar');
  // Con alcance propio ya se ven solo los casos propios: los filtros no aplican.
  const seesAll = scopeOf(me, 'consolidacion.ver') === 'all';
  const consolidators = useQuery({ ...consolidatorsQuery(), enabled: canAssign && seesAll });
  const view = params.view ?? 'board';
  const filter = params.filter ?? 'all';
  const filters = {
    mine: filter === 'mine' || undefined,
    unassigned: filter === 'unassigned' || undefined,
    consolidatorUserId: params.consolidatorUserId,
  };
  const setSearch = (patch: Partial<z.infer<typeof search>>) =>
    void navigate({ search: (prev) => ({ ...prev, page: undefined, ...patch }), replace: true });

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          canManage && (
            <Button leftSection={<IconPlus size={18} />} onClick={() => setOpening(true)}>
              {t('cases.openTitle')}
            </Button>
          )
        }
      />
      <Stack gap="md">
        {seesAll && (
          <Group gap="sm" wrap="wrap">
            <SegmentedControl
              value={filter}
              onChange={(v) =>
                setSearch({
                  filter: v === 'all' ? undefined : (v as 'mine' | 'unassigned'),
                  consolidatorUserId: undefined,
                })
              }
              data={(['all', 'mine', 'unassigned'] as const).map((v) => ({
                value: v,
                label: t(`board.filters.${v}`),
              }))}
            />
            {canAssign && (consolidators.data?.length ?? 0) > 0 && (
              <Select
                aria-label={t('cases.consolidator')}
                placeholder={t('board.anyConsolidator')}
                clearable
                searchable
                data={(consolidators.data ?? []).map((u) => ({ value: String(u.id), label: fullName(u) }))}
                value={params.consolidatorUserId ? String(params.consolidatorUserId) : null}
                onChange={(v) =>
                  setSearch({ consolidatorUserId: v ? Number(v) : undefined, filter: undefined })
                }
                w={{ base: '100%', xs: 220 }}
              />
            )}
          </Group>
        )}
        <Tabs
          value={view}
          onChange={(v) => setSearch({ view: v === 'closed' ? 'closed' : undefined })}
          keepMounted={false}
        >
          <Tabs.List mb="md">
            <Tabs.Tab value="board">{t('board.tab')}</Tabs.Tab>
            <Tabs.Tab value="closed">{t('cases.closedTab')}</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="board">
            <BoardView canManage={canManage} filters={filters} />
          </Tabs.Panel>
          <Tabs.Panel value="closed">
            <ClosedView filters={filters} q={params.q} page={params.page ?? 1} />
          </Tabs.Panel>
        </Tabs>
      </Stack>
      <OpenCaseModal
        opened={opening}
        canAssign={canAssign}
        onClose={() => setOpening(false)}
        onOpened={(c) => {
          setOpening(false);
          notifications.show({ color: 'teal', message: t('cases.opened') });
          void queryClient.invalidateQueries({ queryKey: ['consolidation'] });
          void navigate({ to: '/consolidacion/$caseId', params: { caseId: String(c.id) } });
        }}
      />
    </>
  );
}
