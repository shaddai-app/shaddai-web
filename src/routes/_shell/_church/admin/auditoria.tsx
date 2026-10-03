import {
  Badge,
  Card,
  Code,
  Collapse,
  Group,
  Loader,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { IconChevronDown, IconChevronRight, IconHeadset } from '@tabler/icons-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { auditApi, type AuditEntry } from '../../../../api/admin';
import { requirePermission } from '../../../../auth/guards';
import { FormError } from '../../../../components/FormError';
import { PaginationBar } from '../../../../components/PaginationBar';
import { PageHeader } from '../../../../layout/PageHeader';

const GROUPS = ['auth', 'users', 'roles', 'account', 'structure', 'platform'] as const;
type Group = (typeof GROUPS)[number];

const search = z.object({
  page: z.number().int().min(1).optional(),
  group: z.enum(GROUPS).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const Route = createFileRoute('/_shell/_church/admin/auditoria')({
  validateSearch: search,
  beforeLoad: ({ context }) => requirePermission(context.me, 'auditoria.ver'),
  component: AuditPage,
});

const PAGE_SIZE = 30;

const groupOf = (action: string): Group | undefined => GROUPS.find((g) => action.startsWith(`${g}.`));

function Detail({ entry }: { entry: AuditEntry }) {
  const { t } = useTranslation('admin');
  const [open, setOpen] = useState(false);
  if (entry.before == null && entry.after == null) return null;
  return (
    <>
      <UnstyledButton onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Group gap={4}>
          {open ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
          <Text size="xs" c="dimmed">
            {t('audit.showDetail')}
          </Text>
        </Group>
      </UnstyledButton>
      <Collapse expanded={open}>
        <SimpleGrid cols={{ base: 1, md: entry.before != null && entry.after != null ? 2 : 1 }} mt="xs">
          {entry.before != null && (
            <div>
              <Text size="xs" fw={600} mb={4}>
                {t('audit.before')}
              </Text>
              <Code block fz="xs" style={{ maxHeight: 280, overflow: 'auto' }}>
                {JSON.stringify(entry.before, null, 2)}
              </Code>
            </div>
          )}
          {entry.after != null && (
            <div>
              <Text size="xs" fw={600} mb={4}>
                {t('audit.after')}
              </Text>
              <Code block fz="xs" style={{ maxHeight: 280, overflow: 'auto' }}>
                {JSON.stringify(entry.after, null, 2)}
              </Code>
            </div>
          )}
        </SimpleGrid>
      </Collapse>
    </>
  );
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const { t } = useTranslation('admin');
  const group = groupOf(entry.action);
  const who = entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : t('audit.system');
  return (
    <Card withBorder radius="md" padding="sm">
      <Group justify="space-between" align="flex-start" gap="xs" wrap="wrap">
        <Stack gap={2} miw={0}>
          <Group gap={6} wrap="wrap">
            {group && (
              <Badge variant="light" size="sm">
                {t(`audit.groups.${group}`)}
              </Badge>
            )}
            <Code fz="xs">{entry.action}</Code>
            {entry.entityId && (
              <Text size="xs" c="dimmed">
                #{entry.entityId}
              </Text>
            )}
          </Group>
          <Group gap={6}>
            <Text size="sm" fw={500}>
              {who}
            </Text>
            {entry.support && (
              <Badge color="orange" variant="light" size="sm" leftSection={<IconHeadset size={12} />}>
                {t('audit.support')}
              </Badge>
            )}
          </Group>
        </Stack>
        <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
          {dayjs(entry.createdAt).format('L LTS')}
        </Text>
      </Group>
      <Detail entry={entry} />
    </Card>
  );
}

function AuditPage() {
  const { t } = useTranslation('admin');
  const params = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const page = params.page ?? 1;

  const list = useQuery({
    queryKey: ['audit', { ...params, page }],
    queryFn: () =>
      auditApi.list({
        page,
        pageSize: PAGE_SIZE,
        action: params.group ? `${params.group}.` : undefined,
        from: params.from ? dayjs(params.from).startOf('day').toISOString() : undefined,
        to: params.to ? dayjs(params.to).endOf('day').toISOString() : undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const setSearch = (patch: Partial<z.infer<typeof search>>) =>
    void navigate({ search: (prev) => ({ ...prev, page: undefined, ...patch }), replace: true });

  return (
    <>
      <PageHeader title={t('audit.title')} description={t('audit.description')} />
      <Group gap="sm" mb="md" align="flex-end" wrap="wrap">
        <Select
          label={t('audit.filters.action')}
          placeholder={t('audit.filters.allActions')}
          clearable
          data={GROUPS.map((g) => ({ value: g, label: t(`audit.groups.${g}`) }))}
          value={params.group ?? null}
          onChange={(v) => setSearch({ group: (v as Group | null) ?? undefined })}
          w={{ base: '100%', xs: 240 }}
        />
        <TextInput
          type="date"
          label={t('audit.filters.from')}
          value={params.from ?? ''}
          onChange={(e) => setSearch({ from: e.currentTarget.value || undefined })}
        />
        <TextInput
          type="date"
          label={t('audit.filters.to')}
          value={params.to ?? ''}
          onChange={(e) => setSearch({ to: e.currentTarget.value || undefined })}
        />
      </Group>
      <FormError error={list.error} />
      {list.isPending ? (
        <Loader />
      ) : list.data && list.data.items.length === 0 ? (
        <Text c="dimmed">{t('audit.empty')}</Text>
      ) : (
        list.data && (
          <>
            <Stack gap="xs">
              {list.data.items.map((e) => (
                <AuditRow key={e.id} entry={e} />
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
    </>
  );
}
