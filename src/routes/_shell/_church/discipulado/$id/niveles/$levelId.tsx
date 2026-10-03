import {
  ActionIcon,
  Button,
  Card,
  Center,
  Divider,
  Group,
  Loader,
  Menu,
  Stack,
  Tabs,
  Text,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconDots, IconRotateClockwise, IconTrash, IconUserMinus, IconUserPlus } from '@tabler/icons-react';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import {
  coursesApi,
  ENROLLMENT_STATUSES,
  type Enrollment,
  type EnrollmentStatus,
} from '../../../../../../api/courses';
import { requirePermission } from '../../../../../../auth/guards';
import { can } from '../../../../../../auth/permissions';
import { meQuery } from '../../../../../../auth/session';
import { FormError } from '../../../../../../components/FormError';
import { AnchorLink } from '../../../../../../components/links';
import { EnrollModal } from '../../../../../../features/courses/CourseModals';
import { SessionsPanel } from '../../../../../../features/courses/SessionsPanel';
import { coursesKey, useCourse } from '../../../../../../features/courses/common';
import { formatDate, fullName } from '../../../../../../features/people/format';
import { errorMessage } from '../../../../../../i18n/errors';
import { PageHeader } from '../../../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/discipulado/$id/niveles/$levelId')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'discipulado.ver'),
  validateSearch: z.object({ estado: z.enum([...ENROLLMENT_STATUSES, 'clases']).optional() }),
  component: LevelPage,
});

function EnrollmentRow({
  e,
  canEnroll,
  canSeePeople,
  onComplete,
  onDrop,
  onReactivate,
  onDelete,
}: {
  e: Enrollment;
  canEnroll: boolean;
  canSeePeople: boolean;
  onComplete: () => void;
  onDrop: () => void;
  onReactivate: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation('courses');
  const detail =
    e.status === 'completed'
      ? t('enrollments.completedOn', { date: formatDate(e.completedAt) })
      : e.status === 'dropped'
        ? t('enrollments.droppedOn', { date: formatDate(e.droppedAt) })
        : t('enrollments.since', { date: formatDate(e.enrolledAt) });
  return (
    <Group justify="space-between" wrap="nowrap" gap="xs">
      <div style={{ minWidth: 0 }}>
        {canSeePeople ? (
          <AnchorLink to="/personas/$id" params={{ id: String(e.person.id) }} fw={500}>
            {fullName(e.person)}
          </AnchorLink>
        ) : (
          <Text fw={500}>{fullName(e.person)}</Text>
        )}
        <Text size="xs" c="dimmed">
          {detail}
          {e.notes ? ` · ${e.notes}` : ''}
        </Text>
        {e.progress.sessions > 0 && (
          <Text size="xs" c={e.progress.meetsMinimum === false ? 'red' : 'dimmed'}>
            {t('progress.attendance', {
              attended: e.progress.attended,
              sessions: e.progress.sessions,
              pct: e.progress.pct,
            })}
            {e.progress.meetsMinimum === false ? ` · ${t('progress.belowMinimum')}` : ''}
          </Text>
        )}
      </div>
      {canEnroll && (
        <Group gap={4} wrap="nowrap">
          {e.status === 'active' && (
            <Button size="xs" variant="light" color="teal" onClick={onComplete}>
              {t('enrollments.complete')}
            </Button>
          )}
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon variant="subtle" aria-label={t('actions')}>
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {e.status === 'active' ? (
                <Menu.Item leftSection={<IconUserMinus size={16} />} onClick={onDrop}>
                  {t('enrollments.drop')}
                </Menu.Item>
              ) : (
                <Menu.Item leftSection={<IconRotateClockwise size={16} />} onClick={onReactivate}>
                  {t('enrollments.reactivate')}
                </Menu.Item>
              )}
              <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={onDelete}>
                {t('enrollments.delete')}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      )}
    </Group>
  );
}

function LevelPage() {
  const { t } = useTranslation(['courses', 'common']);
  const params = Route.useParams();
  const courseId = Number(params.id);
  const levelId = Number(params.levelId);
  const { estado = 'active' } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: me } = useSuspenseQuery(meQuery());
  const queryClient = useQueryClient();
  const course = useCourse(courseId);
  const level = course.data?.levels.find((l) => l.id === levelId);
  const [enrolling, setEnrolling] = useState<number | null>(null);
  const enrollments = useQuery({
    queryKey: [...coursesKey, 'enrollments', levelId, estado],
    queryFn: () => coursesApi.enrollments(levelId, estado as EnrollmentStatus),
    enabled: estado !== 'clases',
    retry: false,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: coursesKey });

  const update = async (e: Enrollment, status: EnrollmentStatus, message: string) => {
    try {
      const result = await coursesApi.updateEnrollment(e.id, { status });
      notifications.show({ color: 'teal', message });
      if (result.milestoneAdded && course.data?.milestoneType) {
        notifications.show({
          color: 'teal',
          message: t('enrollments.milestoneAdded', { name: fullName(e.person) }),
        });
      }
      await refresh();
      const next = result.nextLevel;
      if (next && course.data?.levels.find((l) => l.id === next.id)?.canEnroll) {
        modals.openConfirmModal({
          title: t('enrollments.nextTitle'),
          children: (
            <Text size="sm">{t('enrollments.nextBody', { name: fullName(e.person), level: next.name })}</Text>
          ),
          labels: { confirm: t('enrollments.nextConfirm'), cancel: t('enrollments.nextLater') },
          onConfirm: async () => {
            try {
              await coursesApi.enroll(next.id, [e.person.id]);
              notifications.show({
                color: 'teal',
                message: t('enrollments.enrolledNext', { level: next.name }),
              });
              await refresh();
            } catch (err) {
              notifications.show({ color: 'red', message: errorMessage(err) });
            }
          },
        });
      }
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    }
  };

  const remove = (e: Enrollment) =>
    modals.openConfirmModal({
      title: t('enrollments.deleteTitle'),
      children: <Text size="sm">{t('enrollments.deleteBody', { name: fullName(e.person) })}</Text>,
      labels: { confirm: t('delete'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await coursesApi.removeEnrollment(e.id);
          notifications.show({ color: 'teal', message: t('enrollments.deleted') });
          await refresh();
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  if (course.isPending && course.fetchStatus !== 'idle') return <Loader />;
  if (!course.data || !level) return <FormError error={course.error ?? enrollments.error} />;

  const items = enrollments.data?.items ?? [];
  return (
    <Stack gap="md">
      <PageHeader
        back={{ to: '/discipulado/$id', params: { id: String(courseId) } }}
        title={level.name}
        description={level.teacher ? t('teacher', { name: level.teacher.name }) : undefined}
        actions={
          level.canEnroll &&
          level.isActive &&
          course.data.isActive && (
            <Button leftSection={<IconUserPlus size={18} />} onClick={() => setEnrolling(levelId)}>
              {t('enroll.button')}
            </Button>
          )
        }
      />
      <Tabs
        value={estado}
        onChange={(v) =>
          void navigate({ search: { estado: (v ?? 'active') as EnrollmentStatus | 'clases' }, replace: true })
        }
      >
        <Tabs.List style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
          {ENROLLMENT_STATUSES.map((s) => (
            <Tabs.Tab key={s} value={s}>
              {t(`status.${s}`)}
              {level.counts ? ` (${level.counts[s]})` : ''}
            </Tabs.Tab>
          ))}
          <Tabs.Tab value="clases">{t('sessions.tab')}</Tabs.Tab>
        </Tabs.List>
      </Tabs>
      <FormError error={enrollments.error} />
      {estado === 'clases' ? (
        <SessionsPanel levelId={levelId} canEdit={level.canEnroll} />
      ) : enrollments.isPending ? (
        <Center py="xl">
          <Loader />
        </Center>
      ) : items.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          {t(`enrollments.empty.${estado as EnrollmentStatus}`)}
        </Text>
      ) : (
        <Card withBorder radius="lg">
          <Stack gap="sm">
            {items.map((e, i) => (
              <Fragment key={e.id}>
                {i > 0 && <Divider />}
                <EnrollmentRow
                  e={e}
                  canEnroll={level.canEnroll}
                  canSeePeople={can(me, 'personas.ver')}
                  onComplete={() => void update(e, 'completed', t('enrollments.completed'))}
                  onDrop={() => void update(e, 'dropped', t('enrollments.dropped'))}
                  onReactivate={() => void update(e, 'active', t('enrollments.reactivated'))}
                  onDelete={() => remove(e)}
                />
              </Fragment>
            ))}
          </Stack>
        </Card>
      )}
      <EnrollModal
        levelId={enrolling}
        title={t('enroll.title', { level: level.name })}
        onClose={() => setEnrolling(null)}
        onSaved={async (r) => {
          setEnrolling(null);
          notifications.show({
            color: 'teal',
            message:
              r.skipped > 0
                ? t('enroll.doneSkipped', { count: r.created, skipped: r.skipped })
                : t('enroll.done', { count: r.created }),
          });
          await refresh();
        }}
      />
    </Stack>
  );
}
