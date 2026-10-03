import { Badge, Button, Card, Group, Loader, SimpleGrid, Stack, Switch, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { coursesApi, type Course } from '../../../../api/courses';
import { can } from '../../../../auth/permissions';
import { requirePermission } from '../../../../auth/guards';
import { meQuery } from '../../../../auth/session';
import { FormError } from '../../../../components/FormError';
import { AnchorLink, UnstyledLink } from '../../../../components/links';
import { CourseFormModal } from '../../../../features/courses/CourseModals';
import { coursesKey } from '../../../../features/courses/common';
import { useCatalogLabel } from '../../../../features/people/catalog';
import { PageHeader } from '../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/discipulado/')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'discipulado.ver'),
  component: CoursesPage,
});

function CourseCard({ course }: { course: Course }) {
  const { t } = useTranslation('courses');
  const label = useCatalogLabel();
  return (
    <Card withBorder radius="lg">
      <Stack gap="sm">
        <div>
          <Group gap={6} justify="space-between" wrap="nowrap" align="flex-start">
            <UnstyledLink to="/discipulado/$id" params={{ id: String(course.id) }} style={{ minWidth: 0 }}>
              <Title order={3} size="h5">
                {course.name}
              </Title>
            </UnstyledLink>
            {!course.isActive && (
              <Badge size="sm" color="gray" variant="light">
                {t('inactive')}
              </Badge>
            )}
          </Group>
          {course.description && (
            <Text size="sm" c="dimmed" lineClamp={2}>
              {course.description}
            </Text>
          )}
          {course.milestoneType && (
            <Badge mt={6} size="sm" variant="light" color="teal" tt="none">
              {t('givesMilestone', { milestone: label('milestone', course.milestoneType) })}
            </Badge>
          )}
        </div>
        <Stack gap={6}>
          {course.levels.length === 0 && (
            <Text size="sm" c="dimmed">
              {t('noLevels')}
            </Text>
          )}
          {course.levels.map((l) => (
            <Group key={l.id} justify="space-between" wrap="nowrap" gap="xs">
              <div style={{ minWidth: 0 }}>
                {l.canView ? (
                  <AnchorLink
                    to="/discipulado/$id/niveles/$levelId"
                    params={{ id: String(course.id), levelId: String(l.id) }}
                    size="sm"
                    fw={500}
                  >
                    {l.name}
                  </AnchorLink>
                ) : (
                  <Text size="sm" fw={500}>
                    {l.name}
                  </Text>
                )}
                {l.teacher && (
                  <Text size="xs" c="dimmed" truncate>
                    {t('teacher', { name: l.teacher.name })}
                  </Text>
                )}
              </div>
              {l.counts && (
                <Badge variant="light" size="sm" style={{ flexShrink: 0 }}>
                  {t('activeCount', { count: l.counts.active })}
                </Badge>
              )}
            </Group>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}

function CoursesPage() {
  const { t } = useTranslation(['courses', 'common']);
  const { data: me } = useSuspenseQuery(meQuery());
  const manager = can(me, 'discipulado.gestionar');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [includeInactive, setIncludeInactive] = useState(false);
  const [creating, setCreating] = useState(false);
  const list = useQuery({
    queryKey: [...coursesKey, 'list', includeInactive],
    queryFn: () => coursesApi.list(includeInactive),
  });

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          manager && (
            <Button leftSection={<IconPlus size={18} />} onClick={() => setCreating(true)}>
              {t('new')}
            </Button>
          )
        }
      />
      {manager && (
        <Switch
          mb="md"
          label={t('showInactive')}
          checked={includeInactive}
          onChange={(e) => setIncludeInactive(e.currentTarget.checked)}
        />
      )}
      {list.isPending ? (
        <Loader />
      ) : list.isError ? (
        <FormError error={list.error} />
      ) : list.data.items.length === 0 ? (
        <Text c="dimmed">{manager ? t('emptyManager') : t('empty')}</Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md">
          {list.data.items.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </SimpleGrid>
      )}
      <CourseFormModal
        opened={creating}
        course={null}
        onClose={() => setCreating(false)}
        onSaved={async (c) => {
          setCreating(false);
          notifications.show({ color: 'teal', message: t('created') });
          await queryClient.invalidateQueries({ queryKey: coursesKey });
          void navigate({ to: '/discipulado/$id', params: { id: String(c.id) } });
        }}
      />
    </>
  );
}
