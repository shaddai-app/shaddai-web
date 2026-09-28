import {
  Alert,
  Anchor,
  Badge,
  Card,
  Group,
  Loader,
  Progress,
  SegmentedControl,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useNetwork } from '@mantine/hooks';
import { IconCircleCheck, IconClipboardText, IconCloudOff, IconPhone } from '@tabler/icons-react';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import type { CellDetail } from '../../../api/cells';
import { requirePermission } from '../../../auth/guards';
import { can } from '../../../auth/permissions';
import { MyTasksCard } from '../../../features/consolidation/MyTasksCard';
import { meQuery } from '../../../auth/session';
import { FormError } from '../../../components/FormError';
import { AnchorLink, ButtonLink, UnstyledLink } from '../../../components/links';
import { ZoneLabel } from '../../../features/cells/CellBits';
import { cellDetailQuery, cellReportsQuery, myCellsQuery } from '../../../features/cells/queries';
import { lastMeetingDate } from '../../../features/cells/report-form';
import { meetingLabel } from '../../../features/cells/structure';
import { formatDate, fullName } from '../../../features/people/format';
import { PersonAvatar } from '../../../features/people/PersonBits';
import { errorMessage } from '../../../i18n/errors';
import { ApiError } from '../../../api/http';
import { draftEvents, reportDrafts, type ReportDraft } from '../../../pwa/report-drafts';
import { PageHeader } from '../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/mi-celula')({
  validateSearch: z.object({ cellId: z.number().int().optional() }),
  beforeLoad: ({ context }) => requirePermission(context.me, 'celulas.reportar'),
  component: MyCellPage,
});

/** Borrador de la célula (se actualiza cuando la cola lo envía o lo rechaza). */
function useDraft(accountId: number | undefined, userId: number, cellId: number) {
  const [draft, setDraft] = useState<ReportDraft | null>(null);
  useEffect(() => {
    if (!accountId) return;
    const load = () => void reportDrafts.get({ accountId, userId }, cellId).then((d) => setDraft(d ?? null));
    load();
    draftEvents.addEventListener('changed', load);
    return () => draftEvents.removeEventListener('changed', load);
  }, [accountId, userId, cellId]);
  return draft;
}

function DraftNotice({ draft, cellId }: { draft: ReportDraft; cellId: number }) {
  const { t } = useTranslation('cells');
  const color = draft.status === 'error' ? 'red' : draft.status === 'queued' ? 'yellow' : 'blue';
  return (
    <Alert color={color} variant="light" title={t(`report.draft.${draft.status}`)}>
      <Stack gap={6}>
        {draft.status === 'error' && draft.errorCode && (
          <Text size="sm">{errorMessage(new ApiError(400, draft.errorCode))}</Text>
        )}
        <Text size="sm">{t('report.draft.savedAt', { time: dayjs(draft.updatedAt).format('L LT') })}</Text>
        {draft.status !== 'queued' && (
          <AnchorLink
            to="/celulas/$id/reportes/nuevo"
            params={{ id: String(cellId) }}
            search={{ from: 'mi-celula' }}
            size="sm"
            fw={500}
          >
            {t('myCell.continueDraft')}
          </AnchorLink>
        )}
      </Stack>
    </Alert>
  );
}

function WeekCard({ cell, hasDraft }: { cell: CellDetail; hasDraft: boolean }) {
  const { t } = useTranslation('cells');
  const expected = lastMeetingDate(cell.today, cell.meetingDay);
  const done = cell.lastReport && cell.lastReport.meetingDate >= expected;
  return (
    <Card withBorder radius="lg" padding="lg">
      {done ? (
        <Group wrap="nowrap" align="flex-start">
          <ThemeIcon color="teal" variant="light" size="xl" radius="xl">
            <IconCircleCheck size={26} />
          </ThemeIcon>
          <Stack gap={4}>
            <Text fw={600}>{t('myCell.reported')}</Text>
            <Text size="sm" c="dimmed">
              {t('myCell.reportedOn', { date: formatDate(cell.lastReport!.meetingDate) })}
            </Text>
            <AnchorLink
              to="/celulas/$id/reportes/$reportId"
              params={{ id: String(cell.id), reportId: String(cell.lastReport!.id) }}
              size="sm"
            >
              {t('myCell.viewReport')}
            </AnchorLink>
          </Stack>
        </Group>
      ) : (
        <Stack gap="sm">
          <Group wrap="nowrap" align="flex-start">
            <ThemeIcon variant="light" size="xl" radius="xl">
              <IconClipboardText size={24} />
            </ThemeIcon>
            <div>
              <Text fw={600}>{t('myCell.pending')}</Text>
              <Text size="sm" c="dimmed">
                {t('myCell.pendingFor', { date: formatDate(expected) })}
              </Text>
            </div>
          </Group>
          {cell.access.report && !hasDraft && (
            <ButtonLink
              to="/celulas/$id/reportes/nuevo"
              params={{ id: String(cell.id) }}
              search={{ from: 'mi-celula' }}
              size="lg"
              fullWidth
            >
              {t('myCell.loadReport')}
            </ButtonLink>
          )}
        </Stack>
      )}
    </Card>
  );
}

function RecentReports({ cellId }: { cellId: number }) {
  const { t } = useTranslation('cells');
  const network = useNetwork();
  const reports = useQuery({ ...cellReportsQuery(cellId), enabled: network.online });
  if (!network.online || reports.isError) return null;
  return (
    <Card withBorder radius="lg" p={0}>
      <Title order={3} size="h5" p="md" pb="xs">
        {t('myCell.recent')}
      </Title>
      {reports.isPending ? (
        <Loader size="sm" m="md" />
      ) : reports.data.items.length === 0 ? (
        <Text size="sm" c="dimmed" px="md" pb="md">
          {t('detail.noReports')}
        </Text>
      ) : (
        reports.data.items.map((r) => (
          <UnstyledLink
            key={r.id}
            to="/celulas/$id/reportes/$reportId"
            params={{ id: String(cellId), reportId: String(r.id) }}
            px="md"
            py="sm"
            style={{ display: 'block', borderTop: '1px solid var(--mantine-color-default-border)' }}
          >
            <Group justify="space-between" wrap="nowrap">
              <Text size="sm">{formatDate(r.meetingDate)}</Text>
              {r.held ? (
                <Text size="sm" c="dimmed">
                  {t('report.total', { count: r.totals.total })}
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

function MyCell({ cellId }: { cellId: number }) {
  const { t } = useTranslation('cells');
  const { data: me } = useSuspenseQuery(meQuery());
  const cell = useQuery(cellDetailQuery(cellId, me.user.id));
  const draft = useDraft(me.account?.id, me.user.id, cellId);

  if (cell.isPending) return <Loader />;
  if (cell.isError) return <FormError error={cell.error} />;
  const c = cell.data;
  const m = c.multiplication;

  return (
    <Stack gap="md">
      <div>
        <AnchorLink
          to="/celulas/$id"
          params={{ id: String(c.id) }}
          fw={600}
          size="lg"
          c="var(--mantine-color-text)"
        >
          {c.name}
        </AnchorLink>
        <Text size="sm" c="dimmed">
          {meetingLabel(c.meetingDay, c.meetingTime)}
          {c.neighborhood ? ` · ${c.neighborhood}` : ''}
        </Text>
        <ZoneLabel zone={c.zone} size="xs" />
      </div>
      {draft && <DraftNotice draft={draft} cellId={c.id} />}
      <WeekCard cell={c} hasDraft={Boolean(draft)} />

      <Card withBorder radius="lg">
        <Group justify="space-between" mb={6}>
          <Text size="sm" fw={500}>
            {t('detail.growth')}
          </Text>
          <Text size="xs" c="dimmed">
            {t('detail.progress', { members: m.members, target: m.target })}
          </Text>
        </Group>
        <Progress
          value={m.progress}
          color={m.ready ? 'grape' : 'teal'}
          radius="xl"
          aria-label={t('detail.growth')}
        />
      </Card>

      {can(me, 'consolidacion.ver', 'consolidacion.gestionar') && <MyTasksCard />}
      <RecentReports cellId={c.id} />

      <Card withBorder radius="lg" p={0}>
        <Title order={3} size="h5" p="md" pb="xs">
          {t('members.title', { count: c.members.length })}
        </Title>
        {c.members.map((p) => (
          <Group
            key={p.id}
            justify="space-between"
            wrap="nowrap"
            px="md"
            py="xs"
            style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
          >
            <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
              <PersonAvatar person={p} size={32} />
              <Text size="sm" truncate>
                {fullName(p)}
              </Text>
            </Group>
            {p.phone && (
              <Anchor href={`tel:${p.phone}`} size="sm" aria-label={t('myCell.call', { name: fullName(p) })}>
                <IconPhone size={18} />
              </Anchor>
            )}
          </Group>
        ))}
      </Card>
    </Stack>
  );
}

function MyCellPage() {
  const { t } = useTranslation('cells');
  const { data: me } = useSuspenseQuery(meQuery());
  const network = useNetwork();
  const navigate = useNavigate({ from: Route.fullPath });
  const { cellId } = Route.useSearch();
  const cells = useQuery(myCellsQuery(me.user.id));
  const selected = cells.data?.find((c) => c.id === cellId) ?? cells.data?.[0];

  return (
    <Stack gap="md" maw={640}>
      <PageHeader title={t('myCell.title')} />
      {!network.online && (
        <Alert color="yellow" variant="light" icon={<IconCloudOff size={18} />}>
          {t('myCell.offline')}
        </Alert>
      )}
      {cells.isPending ? (
        <Loader />
      ) : cells.isError ? (
        <FormError error={cells.error} />
      ) : !selected ? (
        <Card withBorder radius="lg" padding="lg">
          <Text>{t('myCell.none')}</Text>
          <Text size="sm" c="dimmed">
            {t('myCell.noneHint')}
          </Text>
        </Card>
      ) : (
        <>
          {cells.data.length > 1 && (
            <SegmentedControl
              fullWidth
              value={String(selected.id)}
              onChange={(v) => void navigate({ search: { cellId: Number(v) }, replace: true })}
              data={cells.data.map((c) => ({ value: String(c.id), label: c.name }))}
            />
          )}
          <MyCell cellId={selected.id} />
        </>
      )}
    </Stack>
  );
}
