import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  FileButton,
  Group,
  Loader,
  Menu,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Timeline,
  Title,
  Tooltip,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconBrandWhatsapp,
  IconCamera,
  IconCircleCheck,
  IconDots,
  IconFlag,
  IconGitMerge,
  IconLock,
  IconPencil,
  IconPlus,
  IconTag,
  IconTrash,
  IconUserPlus,
  IconX,
} from '@tabler/icons-react';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useState, type ReactNode } from 'react';
import { AnchorLink } from '../../../../components/links';
import { useTranslation } from 'react-i18next';
import { peopleApi, type PersonDetail, type TimelineItem } from '../../../../api/people';
import { requirePermission } from '../../../../auth/guards';
import { FormError } from '../../../../components/FormError';
import { ContributionsTab } from '../../../../features/finance/PersonContributions';
import { useCatalogLabel } from '../../../../features/people/catalog';
import { FamilyPanel } from '../../../../features/people/FamilyPanel';
import { formatDate, fullName, todayIso, useAgeLabel } from '../../../../features/people/format';
import { PersonAvatar, StatusBadge, TagBadges } from '../../../../features/people/PersonBits';
import { PersonFormModal } from '../../../../features/people/PersonFormModal';
import { PersonActionModal, type PersonModal } from '../../../../features/people/PersonModals';
import { can } from '../../../../auth/permissions';
import { meQuery } from '../../../../auth/session';
import { PersonFollowUpTab } from '../../../../features/consolidation/PersonFollowUpTab';
import { PersonCoursesTab } from '../../../../features/courses/PersonCoursesTab';
import { errorMessage } from '../../../../i18n/errors';

export const Route = createFileRoute('/_shell/_church/personas/$id')({
  // ?tab= abre una pestaña directo (ej. "contributions" desde el reporte de aportes).
  validateSearch: (s: Record<string, unknown>): { tab?: string } =>
    typeof s.tab === 'string' ? { tab: s.tab } : {},
  beforeLoad: ({ context }) => requirePermission(context.me, 'personas.ver'),
  component: PersonPage,
});

const personQuery = (id: number) => ({
  queryKey: ['people', 'detail', id],
  queryFn: () => peopleApi.get(id),
});

function Field({ label, children }: { label: string; children: ReactNode }) {
  const { t } = useTranslation('people');
  const empty = children === null || children === undefined || children === '';
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="sm" component="div" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
        {empty ? t('detail.noValue') : children}
      </Text>
    </div>
  );
}

function InfoTab({ person }: { person: PersonDetail }) {
  const { t } = useTranslation('people');
  const ageLabel = useAgeLabel();
  const waNumber = person.phone?.startsWith('+') ? person.phone.replace(/\D/g, '') : null;
  return (
    <Stack gap="md">
      <Card withBorder radius="lg">
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="md">
          <Field label={t('form.phone')}>
            {person.phone && (
              <Group gap={6}>
                <Anchor href={`tel:${person.phone}`}>{person.phone}</Anchor>
                {waNumber && (
                  <Tooltip label="WhatsApp">
                    <ActionIcon
                      component="a"
                      href={`https://wa.me/${waNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="subtle"
                      color="green"
                      size="sm"
                      aria-label="WhatsApp"
                    >
                      <IconBrandWhatsapp size={16} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>
            )}
          </Field>
          <Field label={t('form.email')}>
            {person.email && <Anchor href={`mailto:${person.email}`}>{person.email}</Anchor>}
          </Field>
          <Field label={t('form.birthDate')}>
            {person.birthDate && `${formatDate(person.birthDate)} (${ageLabel(person.birthDate)})`}
          </Field>
          <Field label={t('form.gender')}>{person.gender && t(`gender.${person.gender}`)}</Field>
          <Field label={t('form.city')}>{[person.city, person.province].filter(Boolean).join(', ')}</Field>
          <Field label={t('form.campus')}>{person.campus?.name}</Field>
          <Field label={t('form.firstVisitAt')}>{formatDate(person.firstVisitAt)}</Field>
          <Field label={t('detail.origin')}>
            {t(`source.${person.source}`)} ·{' '}
            {t('detail.createdAt', { date: dayjs(person.createdAt).format('L') })}
          </Field>
          <Field label={t('detail.consent')}>
            {person.consentAt
              ? t('detail.consentGiven', {
                  date: dayjs(person.consentAt).format('L'),
                  version: person.consentVersion,
                })
              : t('detail.consentMissing')}
          </Field>
          {person.user !== undefined && (
            <Field label={t('detail.linkedUser')}>
              {person.user ? person.user.email : t('detail.noUser')}
            </Field>
          )}
        </SimpleGrid>
        {person.notes && (
          <Stack mt="md" gap={0}>
            <Field label={t('form.notes')}>{person.notes}</Field>
          </Stack>
        )}
      </Card>

      {person.access.sensitive ? (
        <Card withBorder radius="lg">
          <Group gap={6} mb="sm">
            <IconLock size={16} />
            <Text fw={600} size="sm">
              {t('form.sensitive')}
            </Text>
          </Group>
          <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="md">
            <Field label={t('form.documentNumber')}>{person.documentNumber}</Field>
            <Field label={t('form.maritalStatus')}>
              {person.maritalStatus && t(`marital.${person.maritalStatus}`)}
            </Field>
            <Field label={t('form.address')}>{person.address}</Field>
          </SimpleGrid>
          {person.pastoralNotes && (
            <Stack mt="md" gap={0}>
              <Field label={t('form.pastoralNotes')}>{person.pastoralNotes}</Field>
            </Stack>
          )}
        </Card>
      ) : (
        <Alert color="gray" variant="light" icon={<IconLock size={18} />}>
          {t('detail.sensitiveHidden')}
        </Alert>
      )}
    </Stack>
  );
}

function MilestonesTab({
  person,
  onUpdate,
  openModal,
}: {
  person: PersonDetail;
  onUpdate: (p: PersonDetail) => void;
  openModal: (m: PersonModal) => void;
}) {
  const { t } = useTranslation(['people', 'common']);
  const label = useCatalogLabel();
  const canEdit = person.access.edit;

  const act = async (fn: () => Promise<PersonDetail>) => {
    try {
      onUpdate(await fn());
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    }
  };
  const confirm = (title: string, confirmLabel: string, fn: () => Promise<PersonDetail>) =>
    modals.openConfirmModal({
      title,
      labels: { confirm: confirmLabel, cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: () => void act(fn),
    });

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
      <Card withBorder radius="lg">
        <Group justify="space-between" mb="sm">
          <Title order={3} size="h5">
            {t('milestones.title')}
          </Title>
          {canEdit && (
            <Button
              size="xs"
              variant="light"
              leftSection={<IconPlus size={14} />}
              onClick={() => openModal('milestone')}
            >
              {t('milestones.add')}
            </Button>
          )}
        </Group>
        {person.milestones.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t('milestones.empty')}
          </Text>
        ) : (
          <Stack gap="xs">
            {person.milestones.map((m) => (
              <Group key={m.id} justify="space-between" wrap="nowrap" align="flex-start">
                <Group gap="sm" wrap="nowrap" align="flex-start">
                  <IconFlag size={18} color={`var(--mantine-color-${m.type.color ?? 'gray'}-6)`} />
                  <div>
                    <Text size="sm" fw={500}>
                      {label('milestone', m.type)}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {formatDate(m.date)}
                      {m.notes ? ` · ${m.notes}` : ''}
                    </Text>
                  </div>
                </Group>
                {canEdit && (
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    aria-label={t('milestones.remove')}
                    onClick={() =>
                      confirm(t('milestones.removeTitle'), t('milestones.remove'), () =>
                        peopleApi.removeMilestone(person.id, m.id),
                      )
                    }
                  >
                    <IconX size={16} />
                  </ActionIcon>
                )}
              </Group>
            ))}
          </Stack>
        )}
      </Card>

      <Card withBorder radius="lg">
        <Group justify="space-between" mb="sm">
          <Title order={3} size="h5">
            {t('positions.title')}
          </Title>
          {canEdit && (
            <Button
              size="xs"
              variant="light"
              leftSection={<IconPlus size={14} />}
              onClick={() => openModal('position')}
            >
              {t('positions.add')}
            </Button>
          )}
        </Group>
        {person.positions.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t('positions.empty')}
          </Text>
        ) : (
          <Stack gap="xs">
            {person.positions.map((p) => (
              <Group key={p.id} justify="space-between" wrap="nowrap">
                <div>
                  <Group gap={6}>
                    <Text size="sm" fw={500}>
                      {label('position', p.position)}
                    </Text>
                    {!p.until && (
                      <Badge size="xs" variant="light" color="teal">
                        {t('positions.current')}
                      </Badge>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed">
                    {[
                      p.since && `${t('positions.since')} ${formatDate(p.since)}`,
                      p.until && `${t('positions.until')} ${formatDate(p.until)}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </div>
                {canEdit && (
                  <Menu position="bottom-end" withinPortal>
                    <Menu.Target>
                      <ActionIcon variant="subtle" color="gray" aria-label={t('detail.actions')}>
                        <IconDots size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      {!p.until && (
                        <Menu.Item
                          leftSection={<IconCircleCheck size={16} />}
                          onClick={() =>
                            void act(() => peopleApi.updatePosition(person.id, p.id, { until: todayIso() }))
                          }
                        >
                          {t('positions.end')}
                        </Menu.Item>
                      )}
                      <Menu.Item
                        color="red"
                        leftSection={<IconTrash size={16} />}
                        onClick={() =>
                          confirm(t('positions.removeTitle'), t('positions.remove'), () =>
                            peopleApi.removePosition(person.id, p.id),
                          )
                        }
                      >
                        {t('positions.remove')}
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                )}
              </Group>
            ))}
          </Stack>
        )}
      </Card>
    </SimpleGrid>
  );
}

function HistoryTab({ personId }: { personId: number }) {
  const { t } = useTranslation('people');
  const label = useCatalogLabel();
  const timeline = useQuery({
    queryKey: ['people', 'timeline', personId],
    queryFn: () => peopleApi.timeline(personId),
  });
  if (timeline.isPending) return <Loader />;
  if (timeline.error) return <FormError error={timeline.error} />;
  const items = timeline.data.items;
  if (items.length === 0) return <Text c="dimmed">{t('timeline.empty')}</Text>;

  const title = (item: TimelineItem) => {
    switch (item.type) {
      case 'created':
        return t('timeline.created', { source: t(`source.${item.source}`) });
      case 'status':
        return t('timeline.status', {
          from: label('person_status', item.from),
          to: label('person_status', item.to),
        });
      case 'milestone':
        return label('milestone', item.milestone);
      case 'position_start':
        return t('timeline.positionStart', { position: label('position', item.position) });
      case 'position_end':
        return t('timeline.positionEnd', { position: label('position', item.position) });
    }
  };
  const when = (item: TimelineItem) =>
    item.at.length === 10 ? formatDate(item.at) : dayjs(item.at).format('L LT');

  return (
    <Card withBorder radius="lg">
      <Timeline bulletSize={14} lineWidth={2}>
        {items.map((item, i) => (
          <Timeline.Item key={`${item.type}-${i}`} title={<Text size="sm">{title(item)}</Text>}>
            <Text size="xs" c="dimmed">
              {when(item)}
              {'by' in item && item.by ? ` · ${t('timeline.by', { name: fullName(item.by) })}` : ''}
            </Text>
            {'note' in item && item.note && <Text size="sm">{item.note}</Text>}
            {'notes' in item && item.notes && <Text size="sm">{item.notes}</Text>}
          </Timeline.Item>
        ))}
      </Timeline>
    </Card>
  );
}

function PersonPage() {
  const { t } = useTranslation(['people', 'common']);
  const id = Number(Route.useParams().id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery(personQuery(id));
  const [modal, setModal] = useState<PersonModal>(null);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<string | null>(Route.useSearch().tab ?? 'info');
  const { data: me } = useSuspenseQuery(meQuery());
  const showFollowUp = can(me, 'consolidacion.ver');
  const showContributions = can(me, 'finanzas.diezmos_nominales');
  const showCourses = can(me, 'discipulado.ver');
  const ageLabel = useAgeLabel();

  if (query.isPending) return <Loader />;
  if (query.error) {
    return (
      <Stack align="flex-start">
        <FormError error={query.error} />
        <Button variant="subtle" component={Link} to="/personas" leftSection={<IconArrowLeft size={16} />}>
          {t('detail.back')}
        </Button>
      </Stack>
    );
  }
  const person = query.data;
  const canEdit = person.access.edit;

  const update = (p: PersonDetail) => {
    queryClient.setQueryData(personQuery(id).queryKey, p);
    void queryClient.invalidateQueries({ queryKey: ['people', 'list'] });
    void queryClient.invalidateQueries({ queryKey: ['people', 'timeline', id] });
  };
  const refetch = () => {
    void queryClient.invalidateQueries({ queryKey: ['people'] });
    void queryClient.invalidateQueries({ queryKey: ['households'] });
  };

  const uploadPhoto = async (file: File | null) => {
    if (!file) return;
    try {
      await peopleApi.uploadPhoto(person.id, file);
      notifications.show({ color: 'teal', message: t('detail.photo.updated') });
      refetch();
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    }
  };

  const remove = () =>
    modals.openConfirmModal({
      title: t('delete.title', { name: fullName(person) }),
      children: <Text size="sm">{t('delete.body')}</Text>,
      labels: { confirm: t('detail.delete'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await peopleApi.remove(person.id);
          notifications.show({ color: 'teal', message: t('delete.done') });
          void queryClient.invalidateQueries({ queryKey: ['people'] });
          void navigate({ to: '/personas' });
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  const done = (message: string) => (p: PersonDetail) => {
    const merged = modal === 'merge';
    setModal(null);
    notifications.show({ color: 'teal', message });
    if (merged) {
      void queryClient.invalidateQueries({ queryKey: ['people'] });
      void navigate({ to: '/personas/$id', params: { id: String(p.id) } });
    } else {
      update(p);
    }
  };
  const doneMessage = {
    status: t('status.changed'),
    tags: t('tagsModal.saved'),
    milestone: t('milestones.added'),
    position: t('positions.added'),
    merge: t('merge.done'),
  };

  const hasMenu = canEdit || person.access.merge || person.access.delete;

  return (
    <>
      <AnchorLink to="/personas" size="sm" c="dimmed">
        <Group gap={4}>
          <IconArrowLeft size={14} />
          {t('detail.back')}
        </Group>
      </AnchorLink>

      <Card withBorder radius="lg" mt="sm" mb="md">
        <Group justify="space-between" align="flex-start" gap="md">
          <Group gap="md" wrap="nowrap" align="center" style={{ minWidth: 0 }}>
            <div style={{ position: 'relative' }}>
              <PersonAvatar person={person} size={72} />
              {canEdit && (
                <FileButton onChange={(f) => void uploadPhoto(f)} accept="image/png,image/jpeg,image/webp">
                  {(props) => (
                    <Tooltip label={person.photoFileId ? t('detail.photo.change') : t('detail.photo.upload')}>
                      <ActionIcon
                        {...props}
                        size="sm"
                        radius="xl"
                        variant="default"
                        style={{ position: 'absolute', right: -2, bottom: -2 }}
                        aria-label={person.photoFileId ? t('detail.photo.change') : t('detail.photo.upload')}
                      >
                        <IconCamera size={14} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </FileButton>
              )}
            </div>
            <Stack gap={4} style={{ minWidth: 0 }}>
              <Title order={1} size="h2" style={{ overflowWrap: 'anywhere' }}>
                {fullName(person)}
              </Title>
              <Group gap="xs">
                <StatusBadge status={person.status} size="md" />
                <Text size="sm" c="dimmed">
                  {[person.preferredName && `«${person.preferredName}»`, ageLabel(person.birthDate)]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </Group>
              <TagBadges tags={person.tags} max={8} />
            </Stack>
          </Group>

          <Group gap="xs">
            {canEdit && (
              <Button
                variant="default"
                leftSection={<IconPencil size={16} />}
                onClick={() => setEditing(true)}
              >
                {t('detail.edit')}
              </Button>
            )}
            {hasMenu && (
              <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                  <ActionIcon variant="default" size="lg" aria-label={t('detail.actions')}>
                    <IconDots size={18} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  {canEdit && (
                    <>
                      <Menu.Item leftSection={<IconUserPlus size={16} />} onClick={() => setModal('status')}>
                        {t('detail.changeStatus')}
                      </Menu.Item>
                      <Menu.Item leftSection={<IconTag size={16} />} onClick={() => setModal('tags')}>
                        {t('detail.editTags')}
                      </Menu.Item>
                      {person.photoFileId && (
                        <Menu.Item
                          leftSection={<IconCamera size={16} />}
                          onClick={async () => {
                            try {
                              await peopleApi.removePhoto(person.id);
                              refetch();
                            } catch (err) {
                              notifications.show({ color: 'red', message: errorMessage(err) });
                            }
                          }}
                        >
                          {t('detail.photo.remove')}
                        </Menu.Item>
                      )}
                    </>
                  )}
                  {person.access.merge && (
                    <Menu.Item leftSection={<IconGitMerge size={16} />} onClick={() => setModal('merge')}>
                      {t('detail.merge')}
                    </Menu.Item>
                  )}
                  {person.access.delete && (
                    <>
                      <Menu.Divider />
                      <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={remove}>
                        {t('detail.delete')}
                      </Menu.Item>
                    </>
                  )}
                </Menu.Dropdown>
              </Menu>
            )}
          </Group>
        </Group>
      </Card>

      <Tabs value={tab} onChange={setTab} keepMounted={false}>
        <Tabs.List mb="md" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
          <Tabs.Tab value="info">{t('detail.tabs.info')}</Tabs.Tab>
          <Tabs.Tab value="family">{t('detail.tabs.family')}</Tabs.Tab>
          <Tabs.Tab value="milestones">{t('detail.tabs.milestones')}</Tabs.Tab>
          {showFollowUp && <Tabs.Tab value="followup">{t('detail.tabs.followUp')}</Tabs.Tab>}
          {showCourses && <Tabs.Tab value="courses">{t('detail.tabs.courses')}</Tabs.Tab>}
          {showContributions && <Tabs.Tab value="contributions">{t('detail.tabs.contributions')}</Tabs.Tab>}
          <Tabs.Tab value="history">{t('detail.tabs.history')}</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="info">
          <InfoTab person={person} />
        </Tabs.Panel>
        <Tabs.Panel value="family">
          <FamilyPanel person={person} onChanged={refetch} />
        </Tabs.Panel>
        <Tabs.Panel value="milestones">
          <MilestonesTab person={person} onUpdate={update} openModal={setModal} />
        </Tabs.Panel>
        {showFollowUp && (
          <Tabs.Panel value="followup">
            <PersonFollowUpTab person={person} />
          </Tabs.Panel>
        )}
        {showCourses && (
          <Tabs.Panel value="courses">
            <PersonCoursesTab personId={person.id} />
          </Tabs.Panel>
        )}
        <Tabs.Panel value="history">
          <HistoryTab personId={person.id} />
        </Tabs.Panel>
        {showContributions && (
          <Tabs.Panel value="contributions">
            <ContributionsTab person={person} />
          </Tabs.Panel>
        )}
      </Tabs>

      <PersonActionModal
        modal={modal}
        person={person}
        onClose={() => setModal(null)}
        onDone={modal ? done(doneMessage[modal]) : () => undefined}
      />
      <PersonFormModal
        opened={editing}
        person={person}
        canSensitive={person.access.sensitive}
        onClose={() => setEditing(false)}
        onSaved={(p) => {
          setEditing(false);
          notifications.show({ color: 'teal', message: t('form.saved') });
          update(p);
        }}
      />
    </>
  );
}
