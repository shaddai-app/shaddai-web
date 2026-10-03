import {
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconHomeHeart, IconMail, IconPhone, IconPray } from '@tabler/icons-react';
import { keepPreviousData, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { ApiError } from '../../../../api/http';
import { newcomersApi, type NewcomerSubmission } from '../../../../api/people';
import { requirePermission } from '../../../../auth/guards';
import { meQuery } from '../../../../auth/session';
import { FormError } from '../../../../components/FormError';
import { AnchorLink } from '../../../../components/links';
import { PaginationBar } from '../../../../components/PaginationBar';
import { ResponsiveModal } from '../../../../components/ResponsiveModal';
import { campusesQuery, useCatalogOptions } from '../../../../features/people/catalog';
import { formatDate, fullName } from '../../../../features/people/format';
import { ShareFormCard } from '../../../../features/people/ShareFormCard';
import { errorMessage } from '../../../../i18n/errors';
import { PageHeader } from '../../../../layout/PageHeader';

const STATUSES = ['pending', 'accepted', 'rejected'] as const;
type Status = (typeof STATUSES)[number];

export const Route = createFileRoute('/_shell/_church/personas/nuevos')({
  validateSearch: z.object({ status: z.enum(STATUSES).optional(), page: z.number().int().min(1).optional() }),
  beforeLoad: ({ context }) => requirePermission(context.me, 'personas.nuevos_revisar'),
  component: NewcomersPage,
});

const PAGE_SIZE = 20;

function Details({ s }: { s: NewcomerSubmission }) {
  const { t } = useTranslation('people');
  return (
    <Stack gap={6}>
      {s.phone && (
        <Group gap={6}>
          <IconPhone size={14} />
          <Text size="sm">{s.phone}</Text>
        </Group>
      )}
      {s.email && (
        <Group gap={6}>
          <IconMail size={14} />
          <Text size="sm">{s.email}</Text>
        </Group>
      )}
      {(s.city || s.address) && (
        <Text size="sm" c="dimmed">
          {[s.address, s.city].filter(Boolean).join(', ')}
        </Text>
      )}
      {s.birthDate && (
        <Text size="sm" c="dimmed">
          {t('form.birthDate')}: {formatDate(s.birthDate)}
        </Text>
      )}
      {s.howHeard && (
        <Text size="sm">
          <Text span c="dimmed">
            {t('newcomers.howHeard')}:
          </Text>{' '}
          {s.howHeard}
        </Text>
      )}
      {s.prayer && (
        <Group gap={6} align="flex-start" wrap="nowrap">
          <IconPray size={14} style={{ marginTop: 3, flexShrink: 0 }} />
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {s.prayer}
          </Text>
        </Group>
      )}
      {s.wantsVisit && (
        <Badge variant="light" color="marfil" leftSection={<IconHomeHeart size={12} />} w="fit-content">
          {t('newcomers.wantsVisit')}
        </Badge>
      )}
    </Stack>
  );
}

function ReviewForm({ id, onDone }: { id: number; onDone: (message: string) => void }) {
  const { t } = useTranslation(['people', 'common']);
  const statusOptions = useCatalogOptions('person_status');
  const campuses = useQuery(campusesQuery());
  const detail = useQuery({ queryKey: ['newcomers', 'detail', id], queryFn: () => newcomersApi.get(id) });
  const [statusId, setStatusId] = useState<string | null>(null);
  const [campusId, setCampusId] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [forceDuplicate, setForceDuplicate] = useState(false);

  if (detail.isPending) return <Loader />;
  if (detail.error) return <FormError error={detail.error} />;
  const s = detail.data;
  const matches = s.duplicates?.items ?? [];

  const accept = async (key: string, body: Parameters<typeof newcomersApi.accept>[1]) => {
    setError(null);
    setBusy(key);
    try {
      await newcomersApi.accept(id, body);
      onDone(t('newcomers.accepted'));
    } catch (err) {
      if (err instanceof ApiError && err.code === 'PERSON_DUPLICATE_SUSPECTED') setForceDuplicate(true);
      setError(err);
    } finally {
      setBusy(null);
    }
  };

  const reject = () =>
    modals.openConfirmModal({
      title: t('newcomers.rejectTitle', { name: fullName(s) }),
      children: <Text size="sm">{t('newcomers.rejectBody')}</Text>,
      labels: { confirm: t('newcomers.reject'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await newcomersApi.reject(id);
          onDone(t('newcomers.rejected'));
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  return (
    <Stack>
      <Text fw={600} size="lg">
        {fullName(s)}
      </Text>
      <Text size="xs" c="dimmed" mt={-12}>
        {t('newcomers.received', { date: dayjs(s.createdAt).format('L LT') })}
      </Text>
      <Details s={s} />

      <Divider label={t('newcomers.possibleMatches')} labelPosition="left" />
      {matches.length === 0 && !s.duplicates?.hiddenCount ? (
        <Text size="sm" c="dimmed">
          {t('newcomers.noMatches')}
        </Text>
      ) : (
        <Stack gap="xs">
          {matches.map((m) => (
            <Card key={m.id} withBorder radius="md" padding="xs">
              <Group justify="space-between" wrap="nowrap">
                <div>
                  <AnchorLink
                    to="/personas/$id"
                    params={{ id: String(m.id) }}
                    size="sm"
                    fw={500}
                    target="_blank"
                  >
                    {fullName(m)}
                  </AnchorLink>
                  <Text size="xs" c="dimmed">
                    {m.reasons.map((r) => t(`duplicates.reasons.${r}`)).join(', ')}
                  </Text>
                </div>
                <Button
                  size="xs"
                  variant="light"
                  loading={busy === `link-${m.id}`}
                  onClick={() => void accept(`link-${m.id}`, { personId: m.id })}
                >
                  {t('newcomers.link')}
                </Button>
              </Group>
            </Card>
          ))}
          {s.duplicates?.hiddenCount ? (
            <Text size="xs" c="dimmed">
              {t('duplicates.hidden', { count: s.duplicates.hiddenCount })}
            </Text>
          ) : null}
          <Text size="xs" c="dimmed">
            {t('newcomers.linkHint')}
          </Text>
        </Stack>
      )}

      <Divider label={t('newcomers.acceptNew')} labelPosition="left" />
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <Select
          label={t('newcomers.status')}
          placeholder={statusOptions[0]?.label}
          data={statusOptions}
          value={statusId}
          onChange={setStatusId}
          comboboxProps={{ withinPortal: true }}
        />
        {(campuses.data?.length ?? 0) > 1 && (
          <Select
            label={t('newcomers.campus')}
            placeholder={t('form.none')}
            clearable
            data={(campuses.data ?? [])
              .filter((c) => c.isActive)
              .map((c) => ({ value: String(c.id), label: c.name }))}
            value={campusId}
            onChange={setCampusId}
            comboboxProps={{ withinPortal: true }}
          />
        )}
      </SimpleGrid>
      <FormError error={error} />
      {forceDuplicate && (
        <Alert color="orange" variant="light">
          {t('duplicates.body')}
        </Alert>
      )}
      <Group justify="space-between">
        <Button variant="subtle" color="red" onClick={reject}>
          {t('newcomers.reject')}
        </Button>
        <Button
          loading={busy === 'create'}
          onClick={() =>
            void accept('create', {
              statusId: statusId ? Number(statusId) : undefined,
              campusId: campusId ? Number(campusId) : null,
              allowDuplicate: forceDuplicate,
            })
          }
        >
          {forceDuplicate ? t('duplicates.createAnyway') : t('newcomers.acceptNew')}
        </Button>
      </Group>
    </Stack>
  );
}

function NewcomersPage() {
  const { t } = useTranslation(['people', 'common']);
  const { status = 'pending', page = 1 } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const { data: me } = useSuspenseQuery(meQuery());
  const [reviewing, setReviewing] = useState<number | null>(null);
  const list = useQuery({
    queryKey: ['newcomers', 'list', status, page],
    queryFn: () => newcomersApi.list({ status, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const done = (message: string) => {
    setReviewing(null);
    notifications.show({ color: 'teal', message });
    void queryClient.invalidateQueries({ queryKey: ['newcomers'] });
    void queryClient.invalidateQueries({ queryKey: ['people'] });
  };

  return (
    <>
      <PageHeader title={t('newcomers.title')} description={t('newcomers.description')} />
      <Stack gap="md">
        {me.account && <ShareFormCard slug={me.account.slug} />}

        <Tabs
          value={status}
          onChange={(v) => void navigate({ search: { status: (v ?? 'pending') as Status } })}
        >
          <Tabs.List>
            {STATUSES.map((s) => (
              <Tabs.Tab
                key={s}
                value={s}
                rightSection={
                  s === 'pending' && list.data?.pendingCount ? (
                    <Badge size="xs" circle>
                      {list.data.pendingCount}
                    </Badge>
                  ) : undefined
                }
              >
                {t(`newcomers.tabs.${s}`)}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>

        <FormError error={list.error} />
        {list.isPending ? (
          <Loader />
        ) : list.data && list.data.items.length === 0 ? (
          <Text c="dimmed">{t(`newcomers.empty.${status}`)}</Text>
        ) : (
          list.data && (
            <>
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                {list.data.items.map((s) => (
                  <Card key={s.id} withBorder radius="lg">
                    <Stack gap="xs" h="100%">
                      <Group justify="space-between" wrap="nowrap" align="flex-start">
                        <div>
                          <Text fw={600}>{fullName(s)}</Text>
                          <Text size="xs" c="dimmed">
                            {t('newcomers.received', { date: dayjs(s.createdAt).format('L LT') })}
                          </Text>
                        </div>
                      </Group>
                      <Details s={s} />
                      <Group justify="flex-end" mt="auto">
                        {s.status === 'pending' ? (
                          <Button size="xs" onClick={() => setReviewing(s.id)}>
                            {t('newcomers.review')}
                          </Button>
                        ) : (
                          s.personId && (
                            <UnstyledButton
                              onClick={() =>
                                void navigate({ to: '/personas/$id', params: { id: String(s.personId) } })
                              }
                            >
                              <Text size="sm" c="var(--mantine-primary-color-filled)">
                                {t('newcomers.openPerson')}
                              </Text>
                            </UnstyledButton>
                          )
                        )}
                      </Group>
                    </Stack>
                  </Card>
                ))}
              </SimpleGrid>
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

      <ResponsiveModal
        opened={reviewing !== null}
        onClose={() => setReviewing(null)}
        title={t('newcomers.review')}
        size="lg"
      >
        {reviewing !== null && <ReviewForm key={reviewing} id={reviewing} onDone={done} />}
      </ResponsiveModal>
    </>
  );
}
