import {
  Button,
  Card,
  Group,
  Loader,
  Menu,
  MultiSelect,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconDownload, IconPlus, IconSearch, IconUpload } from '@tabler/icons-react';
import { keepPreviousData, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useState } from 'react';
import { AnchorLink, UnstyledLink } from '../../../../components/links';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import {
  importApi,
  peopleApi,
  saveBlob,
  type PersonListItem,
  type SheetFormat,
} from '../../../../api/people';
import { errorMessage } from '../../../../i18n/errors';
import { requirePermission } from '../../../../auth/guards';
import { can, scopeOf } from '../../../../auth/permissions';
import { meQuery } from '../../../../auth/session';
import { FormError } from '../../../../components/FormError';
import { PaginationBar } from '../../../../components/PaginationBar';
import { campusesQuery, tagsQuery, useCatalogOptions } from '../../../../features/people/catalog';
import { fullName, useAgeLabel } from '../../../../features/people/format';
import { PersonAvatar, StatusBadge, TagBadges } from '../../../../features/people/PersonBits';
import { PersonFormModal } from '../../../../features/people/PersonFormModal';
import { PageHeader } from '../../../../layout/PageHeader';

const search = z.object({
  page: z.number().int().min(1).optional(),
  q: z.string().optional(),
  status: z.array(z.number().int()).optional(),
  tagId: z.number().int().optional(),
  campusId: z.number().int().optional(),
  sort: z.enum(['name', 'recent']).optional(),
});

export const Route = createFileRoute('/_shell/_church/personas/')({
  validateSearch: search,
  beforeLoad: ({ context }) => requirePermission(context.me, 'personas.ver'),
  component: PeoplePage,
});

const PAGE_SIZE = 25;

function Contact({ person }: { person: PersonListItem }) {
  return (
    <Stack gap={0}>
      {person.phone && <Text size="sm">{person.phone}</Text>}
      {person.email && (
        <Text size="xs" c="dimmed" truncate maw={240}>
          {person.email}
        </Text>
      )}
    </Stack>
  );
}

function PeoplePage() {
  const { t, i18n } = useTranslation(['people', 'common']);
  const params = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const { data: me } = useSuspenseQuery(meQuery());
  const [q, setQ] = useState(params.q ?? '');
  const [formOpen, setFormOpen] = useState(false);
  const statusOptions = useCatalogOptions('person_status');
  const tags = useQuery(tagsQuery());
  const campuses = useQuery(campusesQuery());
  const ageLabel = useAgeLabel();

  const page = params.page ?? 1;
  const query = {
    q: params.q,
    statusId: params.status?.join(','),
    tagId: params.tagId,
    campusId: params.campusId,
    sort: params.sort ?? 'name',
  };
  const list = useQuery({
    queryKey: ['people', 'list', { ...query, page }],
    queryFn: () => peopleApi.list({ ...query, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const setSearch = (patch: Partial<z.infer<typeof search>>) =>
    void navigate({ search: (prev) => ({ ...prev, page: undefined, ...patch }), replace: true });
  const debouncedQ = useDebouncedCallback((value: string) => setSearch({ q: value || undefined }), 350);
  const filtered = Boolean(params.q || params.status?.length || params.tagId || params.campusId);

  const exportPeople = async (format: SheetFormat) => {
    try {
      const { sort, ...filters } = query;
      const blob = await importApi.export({
        ...filters,
        sort,
        format,
        locale: i18n.resolvedLanguage ?? 'es',
      });
      saveBlob(blob, `${t('list.title').toLowerCase()}-${dayjs().format('YYYY-MM-DD')}.${format}`);
      notifications.show({ color: 'teal', message: t('export.done') });
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    }
  };

  const open = (p: PersonListItem) => void navigate({ to: '/personas/$id', params: { id: String(p.id) } });

  return (
    <>
      <PageHeader
        title={t('list.title')}
        description={t('list.description')}
        actions={
          <Group gap="xs">
            {can(me, 'personas.importar') && (
              <Button
                variant="default"
                leftSection={<IconUpload size={18} />}
                onClick={() => void navigate({ to: '/personas/importar' })}
              >
                {t('import.open')}
              </Button>
            )}
            {can(me, 'personas.exportar') && (
              <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                  <Button variant="default" leftSection={<IconDownload size={18} />}>
                    {t('export.button')}
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>{t('export.hint')}</Menu.Label>
                  {(['xlsx', 'csv'] as const).map((format) => (
                    <Menu.Item key={format} onClick={() => void exportPeople(format)}>
                      {t(`export.${format}`)}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>
            )}
            {can(me, 'personas.crear') && (
              <Button leftSection={<IconPlus size={18} />} onClick={() => setFormOpen(true)}>
                {t('list.add')}
              </Button>
            )}
          </Group>
        }
      />

      <Stack gap="md">
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
            style={{ flex: '1 1 260px' }}
          />
          <MultiSelect
            aria-label={t('list.status')}
            placeholder={params.status?.length ? undefined : t('list.allStatuses')}
            data={statusOptions}
            value={(params.status ?? []).map(String)}
            onChange={(v) => setSearch({ status: v.length ? v.map(Number) : undefined })}
            clearable
            w={{ base: '100%', xs: 240 }}
          />
          {(tags.data?.length ?? 0) > 0 && (
            <Select
              aria-label={t('list.tag')}
              placeholder={t('list.allTags')}
              clearable
              searchable
              data={(tags.data ?? []).map((tg) => ({ value: String(tg.id), label: tg.name }))}
              value={params.tagId ? String(params.tagId) : null}
              onChange={(v) => setSearch({ tagId: v ? Number(v) : undefined })}
              w={{ base: '100%', xs: 200 }}
            />
          )}
          {(campuses.data?.length ?? 0) > 1 && (
            <Select
              aria-label={t('list.campus')}
              placeholder={t('list.allCampuses')}
              clearable
              data={(campuses.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
              value={params.campusId ? String(params.campusId) : null}
              onChange={(v) => setSearch({ campusId: v ? Number(v) : undefined })}
              w={{ base: '100%', xs: 200 }}
            />
          )}
          <SegmentedControl
            value={params.sort ?? 'name'}
            onChange={(v) => setSearch({ sort: v === 'name' ? undefined : (v as 'recent') })}
            data={(['name', 'recent'] as const).map((v) => ({ value: v, label: t(`list.sort.${v}`) }))}
          />
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
                        <Table.Th>{t('list.columns.status')}</Table.Th>
                        <Table.Th>{t('list.columns.contact')}</Table.Th>
                        <Table.Th>{t('list.columns.tags')}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {list.data.items.map((p) => (
                        <Table.Tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => open(p)}>
                          <Table.Td>
                            <Group gap="sm" wrap="nowrap">
                              <PersonAvatar person={p} size={36} />
                              <div>
                                <AnchorLink
                                  to="/personas/$id"
                                  params={{ id: String(p.id) }}
                                  size="sm"
                                  fw={500}
                                  c="var(--mantine-color-text)"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {fullName(p)}
                                </AnchorLink>
                                <Text size="xs" c="dimmed">
                                  {[p.preferredName, ageLabel(p.birthDate), p.household?.name]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </Text>
                              </div>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <StatusBadge status={p.status} />
                          </Table.Td>
                          <Table.Td>
                            <Contact person={p} />
                          </Table.Td>
                          <Table.Td>
                            <TagBadges tags={p.tags} />
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              </Card>

              {/* Celular: tarjetas */}
              <Stack gap="xs" hiddenFrom="sm">
                {list.data.items.map((p) => (
                  <UnstyledLink key={p.id} to="/personas/$id" params={{ id: String(p.id) }}>
                    <Card withBorder radius="lg" padding="sm">
                      <Group gap="sm" wrap="nowrap" align="flex-start">
                        <PersonAvatar person={p} size={42} />
                        <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
                          <Group justify="space-between" wrap="nowrap" gap="xs">
                            <Text fw={500} truncate>
                              {fullName(p)}
                            </Text>
                            <StatusBadge status={p.status} size="xs" />
                          </Group>
                          {(p.phone || p.email) && (
                            <Text size="xs" c="dimmed" truncate>
                              {p.phone ?? p.email}
                            </Text>
                          )}
                          <TagBadges tags={p.tags} max={2} />
                        </Stack>
                      </Group>
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

      <PersonFormModal
        opened={formOpen}
        person={null}
        canSensitive={Boolean(scopeOf(me, 'personas.ver_sensibles'))}
        onClose={() => setFormOpen(false)}
        onSaved={(p) => {
          setFormOpen(false);
          notifications.show({ color: 'teal', message: t('form.created') });
          void queryClient.invalidateQueries({ queryKey: ['people'] });
          void navigate({ to: '/personas/$id', params: { id: String(p.id) } });
        }}
      />
    </>
  );
}
