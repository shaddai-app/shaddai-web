import {
  Badge,
  Card,
  Code,
  Collapse,
  Group,
  Loader,
  Select,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import { IconChevronDown, IconChevronRight, IconHeadset } from '@tabler/icons-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { platformApi, type PlatformAuditEntry } from '../../../../api/platform';
import { FormError } from '../../../../components/FormError';
import { PaginationBar } from '../../../../components/PaginationBar';
import { PageHeader } from '../../../../layout/PageHeader';

const search = z.object({
  page: z.number().int().min(1).optional(),
  accountId: z.number().int().optional(),
  action: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const Route = createFileRoute('/_shell/_platform/plataforma/auditoria')({
  validateSearch: search,
  component: PlatformAuditPage,
});

const PAGE_SIZE = 30;

function Row({ entry, accountName }: { entry: PlatformAuditEntry; accountName?: string }) {
  const { t } = useTranslation(['platform', 'admin']);
  const [open, setOpen] = useState(false);
  const hasDetail = entry.before != null || entry.after != null;
  return (
    <Card withBorder radius="md" padding="sm">
      <Group justify="space-between" align="flex-start" gap="xs" wrap="wrap">
        <Stack gap={2}>
          <Group gap={6} wrap="wrap">
            <Code fz="xs">{entry.action}</Code>
            {entry.entityId && (
              <Text size="xs" c="dimmed">
                {entry.entity} #{entry.entityId}
              </Text>
            )}
            {entry.impersonatorId && (
              <Badge color="orange" variant="light" size="sm" leftSection={<IconHeadset size={12} />}>
                {t('audit.support')}
              </Badge>
            )}
          </Group>
          <Group gap={6}>
            {entry.accountId ? (
              <Link
                to="/plataforma/cuentas/$id"
                params={{ id: String(entry.accountId) }}
                style={{ color: 'var(--mantine-primary-color-filled)', textDecoration: 'none' }}
              >
                <Text size="sm">{accountName ?? `#${entry.accountId}`}</Text>
              </Link>
            ) : (
              <Text size="sm" c="dimmed">
                {t('audit.platformOnly')}
              </Text>
            )}
            <Text size="xs" c="dimmed">
              {entry.userId ? `user #${entry.userId}` : t('audit.system')}
              {entry.ip ? ` · ${entry.ip}` : ''}
            </Text>
          </Group>
        </Stack>
        <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
          {dayjs(entry.createdAt).format('L LTS')}
        </Text>
      </Group>
      {hasDetail && (
        <>
          <UnstyledButton onClick={() => setOpen((o) => !o)} aria-expanded={open} mt={4}>
            <Group gap={4}>
              {open ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
              <Text size="xs" c="dimmed">
                {t('admin:audit.showDetail')}
              </Text>
            </Group>
          </UnstyledButton>
          <Collapse expanded={open}>
            <Code block fz="xs" mt="xs" style={{ maxHeight: 280, overflow: 'auto' }}>
              {JSON.stringify({ before: entry.before, after: entry.after }, null, 2)}
            </Code>
          </Collapse>
        </>
      )}
    </Card>
  );
}

function PlatformAuditPage() {
  const { t } = useTranslation(['platform', 'admin']);
  const params = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const page = params.page ?? 1;
  const [action, setAction] = useState(params.action ?? '');

  // Selector de iglesia: primeras 100 por fecha (suficiente para la etapa inicial).
  const accounts = useQuery({
    queryKey: ['platform', 'accounts', 'picker'],
    queryFn: () => platformApi.accounts({ pageSize: 100 }),
  });
  const names = new Map((accounts.data?.items ?? []).map((a) => [a.id, a.name]));

  const list = useQuery({
    queryKey: ['platform', 'audit', { ...params, page }],
    queryFn: () =>
      platformApi.audit({
        page,
        pageSize: PAGE_SIZE,
        accountId: params.accountId,
        action: params.action,
        from: params.from ? dayjs(params.from).startOf('day').toISOString() : undefined,
        to: params.to ? dayjs(params.to).endOf('day').toISOString() : undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const setSearch = (patch: Partial<z.infer<typeof search>>) =>
    void navigate({ search: (prev) => ({ ...prev, page: undefined, ...patch }), replace: true });
  const debouncedAction = useDebouncedCallback((v: string) => setSearch({ action: v || undefined }), 400);

  return (
    <>
      <PageHeader title={t('audit.title')} />
      <Group gap="sm" mb="md" align="flex-end" wrap="wrap">
        <Select
          label={t('audit.account')}
          placeholder={t('audit.allAccounts')}
          clearable
          searchable
          data={(accounts.data?.items ?? []).map((a) => ({ value: String(a.id), label: a.name }))}
          value={params.accountId ? String(params.accountId) : null}
          onChange={(v) => setSearch({ accountId: v ? Number(v) : undefined })}
          w={{ base: '100%', xs: 260 }}
        />
        <TextInput
          label={t('audit.action')}
          placeholder="platform."
          value={action}
          onChange={(e) => {
            setAction(e.currentTarget.value);
            debouncedAction(e.currentTarget.value);
          }}
        />
        <TextInput
          type="date"
          label={t('admin:audit.filters.from')}
          value={params.from ?? ''}
          onChange={(e) => setSearch({ from: e.currentTarget.value || undefined })}
        />
        <TextInput
          type="date"
          label={t('admin:audit.filters.to')}
          value={params.to ?? ''}
          onChange={(e) => setSearch({ to: e.currentTarget.value || undefined })}
        />
      </Group>
      <FormError error={list.error} />
      {list.isPending ? (
        <Loader />
      ) : list.data && list.data.items.length === 0 ? (
        <Text c="dimmed">{t('admin:audit.empty')}</Text>
      ) : (
        list.data && (
          <>
            <Stack gap="xs">
              {list.data.items.map((e) => (
                <Row key={e.id} entry={e} accountName={e.accountId ? names.get(e.accountId) : undefined} />
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
