import {
  ActionIcon,
  Anchor,
  Badge,
  Button,
  Card,
  ColorSwatch,
  Group,
  Loader,
  RingProgress,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { complianceApi, type ComplianceItem } from '../../../../api/cells';
import { requirePermission } from '../../../../auth/guards';
import { FormError } from '../../../../components/FormError';
import { AnchorLink } from '../../../../components/links';
import { COMPLIANCE_COLORS, COMPLIANCE_ORDER, shiftWeek } from '../../../../features/cells/compliance';
import {
  meetingLabel,
  networksQuery,
  useStructureLabels,
  zonesQuery,
} from '../../../../features/cells/structure';
import { useBreakdown } from '../../../../features/cells/use-breakdown';
import { formatDate, fullName, todayIso } from '../../../../features/people/format';
import { PageHeader } from '../../../../layout/PageHeader';

const search = z.object({
  week: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  networkId: z.number().int().optional(),
  zoneId: z.number().int().optional(),
  /** Solo lo que requiere atención (faltan y pendientes). */
  attention: z.boolean().optional(),
});

export const Route = createFileRoute('/_shell/_church/celulas/reportes')({
  validateSearch: search,
  beforeLoad: ({ context }) => requirePermission(context.me, 'celulas.ver_reportes'),
  component: CompliancePage,
});

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Card withBorder radius="md" p="sm">
      <Group gap={6} wrap="nowrap">
        {color && <ColorSwatch color={`var(--mantine-color-${color}-6)`} size={10} withShadow={false} />}
        <Text size="xs" c="dimmed">
          {label}
        </Text>
      </Group>
      <Text fw={700} size="xl">
        {value}
      </Text>
    </Card>
  );
}

function Row({ item }: { item: ComplianceItem }) {
  const { t } = useTranslation('cells');
  const breakdown = useBreakdown();
  const color = COMPLIANCE_COLORS[item.status];
  return (
    <Group
      justify="space-between"
      wrap="nowrap"
      px="md"
      py="sm"
      gap="sm"
      style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
    >
      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
        <ColorSwatch
          color={`var(--mantine-color-${color}-6)`}
          size={14}
          withShadow={false}
          style={{ flexShrink: 0 }}
          aria-label={t(`compliance.status.${item.status}`)}
        />
        <div style={{ minWidth: 0 }}>
          <AnchorLink
            to="/celulas/$id"
            params={{ id: String(item.cell.id) }}
            size="sm"
            fw={500}
            c="var(--mantine-color-text)"
          >
            {item.cell.name}
          </AnchorLink>
          <Text size="xs" c="dimmed" truncate>
            {meetingLabel(item.cell.meetingDay, item.cell.meetingTime)} · {fullName(item.leader)}
            {item.leader.phone && (
              <>
                {' · '}
                <Anchor href={`tel:${item.leader.phone}`} size="xs">
                  {item.leader.phone}
                </Anchor>
              </>
            )}
          </Text>
        </div>
      </Group>
      <Stack gap={2} align="flex-end" style={{ flexShrink: 0 }}>
        <Group gap={4} wrap="nowrap">
          {item.late && (
            <Tooltip label={t('compliance.lateHint')}>
              <Badge size="xs" variant="outline" color="orange">
                {t('compliance.late')}
              </Badge>
            </Tooltip>
          )}
          {item.report ? (
            <AnchorLink
              to="/celulas/$id/reportes/$reportId"
              params={{ id: String(item.cell.id), reportId: String(item.report.id) }}
              size="xs"
            >
              <Badge size="sm" variant="light" color={color} style={{ cursor: 'pointer' }}>
                {t(`compliance.status.${item.status}`)}
              </Badge>
            </AnchorLink>
          ) : (
            <Badge size="sm" variant="light" color={color}>
              {item.status === 'upcoming'
                ? t('compliance.meetsOn', { date: formatDate(item.expectedDate) })
                : t(`compliance.status.${item.status}`)}
            </Badge>
          )}
        </Group>
        {item.report && item.status === 'reported' && (
          <Text size="xs" c="dimmed" visibleFrom="xs">
            {breakdown(item.report.totals)}
          </Text>
        )}
      </Stack>
    </Group>
  );
}

function CompliancePage() {
  const { t } = useTranslation(['cells', 'common']);
  const params = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const labels = useStructureLabels();
  const networks = useQuery(networksQuery());
  const zones = useQuery(zonesQuery());
  const query = { week: params.week, networkId: params.networkId, zoneId: params.zoneId };
  const data = useQuery({
    queryKey: ['reports', 'compliance', query],
    queryFn: () => complianceApi.get(query),
    placeholderData: keepPreviousData,
  });

  const setSearch = (patch: Partial<z.infer<typeof search>>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });
  const zoneOptions = (zones.data ?? [])
    .filter((z) => !params.networkId || z.network.id === params.networkId)
    .map((z) => ({ value: String(z.id), label: z.name }));

  const week = data.data?.week;
  const s = data.data?.summary;
  const isCurrent = !params.week;
  const items = (data.data?.items ?? [])
    .filter((i) => !params.attention || i.status === 'missing' || i.status === 'pending')
    .sort((a, b) => COMPLIANCE_ORDER[a.status] - COMPLIANCE_ORDER[b.status]);
  // Agrupadas por zona (la API ya viene ordenada por red, zona y nombre).
  const groups: { zone: ComplianceItem['zone']; items: ComplianceItem[] }[] = [];
  for (const it of items) {
    const g = groups.find((x) => x.zone.id === it.zone.id);
    if (g) g.items.push(it);
    else groups.push({ zone: it.zone, items: [it] });
  }
  groups.sort(
    (a, b) =>
      a.zone.network.name.localeCompare(b.zone.network.name) || a.zone.name.localeCompare(b.zone.name),
  );

  return (
    <>
      <PageHeader title={t('compliance.title')} description={t('compliance.description')} />
      <Stack gap="md">
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Group gap="xs" wrap="nowrap">
            <ActionIcon
              variant="default"
              size="lg"
              aria-label={t('compliance.prevWeek')}
              disabled={!week}
              onClick={() => week && setSearch({ week: shiftWeek(week.start, -1) })}
            >
              <IconChevronLeft size={18} />
            </ActionIcon>
            <Text fw={500} size="sm" miw={180} ta="center">
              {week
                ? t('compliance.week', { start: formatDate(week.start), end: formatDate(week.end) })
                : '…'}
            </Text>
            <ActionIcon
              variant="default"
              size="lg"
              aria-label={t('compliance.nextWeek')}
              disabled={!week || isCurrent}
              onClick={() => {
                if (!week) return;
                const next = shiftWeek(week.start, 1);
                // Si la siguiente es la semana actual, la URL queda limpia (la API usa el "hoy" de la cuenta).
                setSearch({ week: shiftWeek(next, 1) > todayIso() ? undefined : next });
              }}
            >
              <IconChevronRight size={18} />
            </ActionIcon>
            {!isCurrent && (
              <Button variant="subtle" size="compact-sm" onClick={() => setSearch({ week: undefined })}>
                {t('compliance.thisWeek')}
              </Button>
            )}
          </Group>
          <Group gap="sm" wrap="wrap">
            {(networks.data?.length ?? 0) > 1 && (
              <Select
                aria-label={labels.network}
                placeholder={t('list.all', { label: labels.network })}
                clearable
                data={(networks.data ?? []).map((n) => ({ value: String(n.id), label: n.name }))}
                value={params.networkId ? String(params.networkId) : null}
                onChange={(v) => setSearch({ networkId: v ? Number(v) : undefined, zoneId: undefined })}
                w={{ base: '100%', xs: 180 }}
              />
            )}
            {zoneOptions.length > 1 && (
              <Select
                aria-label={labels.zone}
                placeholder={t('list.all', { label: labels.zone })}
                clearable
                data={zoneOptions}
                value={params.zoneId ? String(params.zoneId) : null}
                onChange={(v) => setSearch({ zoneId: v ? Number(v) : undefined })}
                w={{ base: '100%', xs: 180 }}
              />
            )}
          </Group>
        </Group>

        <FormError error={data.error} />
        {data.isPending ? (
          <Loader />
        ) : (
          s && (
            <>
              <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} spacing="sm">
                <Card withBorder radius="md" p="sm">
                  <Group gap="sm" wrap="nowrap">
                    <RingProgress
                      size={56}
                      thickness={6}
                      roundCaps
                      sections={[
                        {
                          value: s.rate ?? 0,
                          color: (s.rate ?? 0) >= 80 ? 'teal' : (s.rate ?? 0) >= 50 ? 'yellow' : 'red',
                        },
                      ]}
                      label={
                        <Text size="xs" ta="center" fw={700}>
                          {s.rate === null ? '—' : `${s.rate}%`}
                        </Text>
                      }
                    />
                    <Text size="xs" c="dimmed">
                      {t('compliance.rate')}
                    </Text>
                  </Group>
                </Card>
                <Stat label={t('compliance.summary.sent')} value={s.reported + s.notHeld} color="teal" />
                <Stat label={t('compliance.summary.pending')} value={s.pending} color="yellow" />
                <Stat label={t('compliance.summary.missing')} value={s.missing} color="red" />
                <Stat label={t('compliance.summary.upcoming')} value={s.upcoming} color="gray" />
                <Stat label={t('compliance.summary.attendance')} value={s.attendance} />
              </SimpleGrid>

              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  {t('list.total', { count: s.cells })}
                </Text>
                <Switch
                  label={t('compliance.attentionOnly')}
                  checked={Boolean(params.attention)}
                  onChange={(e) => setSearch({ attention: e.currentTarget.checked || undefined })}
                />
              </Group>

              {groups.length === 0 ? (
                <Text c="dimmed">{params.attention ? t('compliance.allGood') : t('list.empty')}</Text>
              ) : (
                groups.map((g) => (
                  <Card key={g.zone.id} withBorder radius="lg" p={0}>
                    <Group gap="xs" px="md" py="xs" bg="var(--mantine-color-default-hover)">
                      <ColorSwatch
                        color={`var(--mantine-color-${g.zone.network.color ?? 'gray'}-6)`}
                        size={12}
                        withShadow={false}
                      />
                      <Text size="sm" fw={600}>
                        {g.zone.network.name} · {g.zone.name}
                      </Text>
                    </Group>
                    {g.items.map((it) => (
                      <Row key={it.cell.id} item={it} />
                    ))}
                  </Card>
                ))
              )}
            </>
          )
        )}
      </Stack>
    </>
  );
}
