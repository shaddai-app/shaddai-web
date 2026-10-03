import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  Menu,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconArrowDown, IconArrowUp, IconDots, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { coursesApi, type Course, type CourseLevel } from '../../../../../api/courses';
import { requirePermission } from '../../../../../auth/guards';
import { can } from '../../../../../auth/permissions';
import { meQuery } from '../../../../../auth/session';
import { FormError } from '../../../../../components/FormError';
import { AnchorLink } from '../../../../../components/links';
import { CourseFormModal, LevelFormModal } from '../../../../../features/courses/CourseModals';
import { courseQuery, coursesKey, useCourse } from '../../../../../features/courses/common';
import { moveItem } from '../../../../../features/ministries/common';
import { useCatalogLabel } from '../../../../../features/people/catalog';
import { errorMessage } from '../../../../../i18n/errors';
import { PageHeader } from '../../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/discipulado/$id/')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'discipulado.ver'),
  component: CoursePage,
});

function CoursePage() {
  const { t } = useTranslation(['courses', 'common']);
  const id = Number(Route.useParams().id);
  const { data: me } = useSuspenseQuery(meQuery());
  const manager = can(me, 'discipulado.gestionar');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const label = useCatalogLabel();
  const course = useCourse(id);
  const [editing, setEditing] = useState(false);
  const [levelForm, setLevelForm] = useState<{ level: CourseLevel | null } | null>(null);

  const saved = async (c: Course, message: string) => {
    queryClient.setQueryData(courseQuery(id).queryKey, c);
    notifications.show({ color: 'teal', message });
    await queryClient.invalidateQueries({ queryKey: coursesKey });
  };
  const run = async (action: () => Promise<Course>, message: string) => {
    try {
      await saved(await action(), message);
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    }
  };

  const removeCourse = (c: Course) =>
    modals.openConfirmModal({
      title: t('deleteTitle'),
      children: <Text size="sm">{t('deleteBody', { name: c.name })}</Text>,
      labels: { confirm: t('delete'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await coursesApi.remove(c.id);
          notifications.show({ color: 'teal', message: t('deleted') });
          void navigate({ to: '/discipulado' });
          await queryClient.invalidateQueries({ queryKey: coursesKey });
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  const removeLevel = (l: CourseLevel) =>
    modals.openConfirmModal({
      title: t('levels.deleteTitle'),
      children: <Text size="sm">{t('levels.deleteBody', { name: l.name })}</Text>,
      labels: { confirm: t('delete'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await coursesApi.removeLevel(l.id);
          notifications.show({ color: 'teal', message: t('levels.deleted') });
          await queryClient.invalidateQueries({ queryKey: coursesKey });
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  if (course.isPending && course.fetchStatus !== 'idle') return <Loader />;
  if (!course.data) return <FormError error={course.error} />;
  const c = course.data;

  return (
    <Stack gap="md" maw={820}>
      <AnchorLink to="/discipulado" size="sm">
        ← {t('backToList')}
      </AnchorLink>
      <PageHeader
        title={c.name}
        description={c.description ?? undefined}
        actions={
          manager && (
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon variant="default" size="lg" aria-label={t('actions')}>
                  <IconDots size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => setEditing(true)}>
                  {t('edit')}
                </Menu.Item>
                <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={() => removeCourse(c)}>
                  {t('delete')}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )
        }
      />
      {(c.milestoneType || !c.isActive) && (
        <Group gap={6}>
          {c.milestoneType && (
            <Badge variant="light" color="teal" tt="none">
              {t('givesMilestone', { milestone: label('milestone', c.milestoneType) })}
            </Badge>
          )}
          {!c.isActive && (
            <Badge variant="light" color="gray">
              {t('inactive')}
            </Badge>
          )}
        </Group>
      )}

      <Card withBorder radius="lg">
        <Group justify="space-between" mb="sm">
          <Title order={3} size="h5">
            {t('levels.title')}
          </Title>
          {manager && (
            <Button
              size="xs"
              variant="light"
              leftSection={<IconPlus size={14} />}
              onClick={() => setLevelForm({ level: null })}
            >
              {t('levels.add')}
            </Button>
          )}
        </Group>
        {c.levels.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t('noLevels')}
          </Text>
        ) : (
          <Stack gap="sm">
            {c.levels.map((l, i) => (
              <Fragment key={l.id}>
                {i > 0 && <Divider />}
                <Group justify="space-between" wrap="nowrap" align="flex-start" gap="xs">
                  <div style={{ minWidth: 0 }}>
                    <Group gap={6}>
                      {l.canView ? (
                        <AnchorLink
                          to="/discipulado/$id/niveles/$levelId"
                          params={{ id: String(c.id), levelId: String(l.id) }}
                          fw={600}
                        >
                          {l.name}
                        </AnchorLink>
                      ) : (
                        <Text fw={600}>{l.name}</Text>
                      )}
                      {!l.isActive && (
                        <Badge size="xs" color="gray" variant="light">
                          {t('inactive')}
                        </Badge>
                      )}
                    </Group>
                    <Text size="xs" c="dimmed">
                      {l.teacher ? t('teacher', { name: l.teacher.name }) : t('noTeacher')}
                    </Text>
                    {l.counts && (
                      <Text size="xs" c="dimmed">
                        {t('levels.counts', {
                          active: l.counts.active,
                          completed: l.counts.completed,
                        })}
                      </Text>
                    )}
                  </div>
                  {manager && (
                    <Group gap={2} wrap="nowrap">
                      <ActionIcon
                        variant="subtle"
                        aria-label={t('levels.up')}
                        disabled={i === 0}
                        onClick={() =>
                          void run(
                            () =>
                              coursesApi.reorderLevels(
                                c.id,
                                moveItem(c.levels, i, -1).map((x) => x.id),
                              ),
                            t('levels.reordered'),
                          )
                        }
                      >
                        <IconArrowUp size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        aria-label={t('levels.down')}
                        disabled={i === c.levels.length - 1}
                        onClick={() =>
                          void run(
                            () =>
                              coursesApi.reorderLevels(
                                c.id,
                                moveItem(c.levels, i, 1).map((x) => x.id),
                              ),
                            t('levels.reordered'),
                          )
                        }
                      >
                        <IconArrowDown size={16} />
                      </ActionIcon>
                      <Menu position="bottom-end" withinPortal>
                        <Menu.Target>
                          <ActionIcon variant="subtle" aria-label={t('actions')}>
                            <IconDots size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconPencil size={16} />}
                            onClick={() => setLevelForm({ level: l })}
                          >
                            {t('edit')}
                          </Menu.Item>
                          <Menu.Item
                            color="red"
                            leftSection={<IconTrash size={16} />}
                            onClick={() => removeLevel(l)}
                          >
                            {t('delete')}
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  )}
                </Group>
              </Fragment>
            ))}
          </Stack>
        )}
      </Card>

      <CourseFormModal
        opened={editing}
        course={c}
        onClose={() => setEditing(false)}
        onSaved={async (updated) => {
          setEditing(false);
          await saved(updated, t('saved'));
        }}
      />
      <LevelFormModal
        opened={levelForm !== null}
        courseId={c.id}
        level={levelForm?.level ?? null}
        onClose={() => setLevelForm(null)}
        onSaved={async (updated) => {
          setLevelForm(null);
          await saved(updated, t('levels.saved'));
        }}
      />
    </Stack>
  );
}
