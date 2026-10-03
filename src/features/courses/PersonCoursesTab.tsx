import { Badge, Card, Divider, Group, Loader, Stack, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { coursesApi, type EnrollmentStatus } from '../../api/courses';
import { FormError } from '../../components/FormError';
import { AnchorLink } from '../../components/links';
import { formatDate } from '../people/format';
import { coursesKey } from './common';

const STATUS_COLORS: Record<EnrollmentStatus, string> = {
  active: 'blue',
  completed: 'teal',
  dropped: 'gray',
};

/** Pestaña "Formación" de la ficha: cursos y niveles de la persona. */
export function PersonCoursesTab({ personId }: { personId: number }) {
  const { t } = useTranslation('courses');
  const query = useQuery({
    queryKey: [...coursesKey, 'person', personId],
    queryFn: () => coursesApi.personCourses(personId),
  });
  if (query.isPending) return <Loader />;
  if (query.isError) return <FormError error={query.error} />;
  if (!query.data.items.length) return <Text c="dimmed">{t('person.empty')}</Text>;
  return (
    <Card withBorder radius="lg">
      <Stack gap="sm">
        {query.data.items.map((e, i) => (
          <Fragment key={e.id}>
            {i > 0 && <Divider />}
            <Group justify="space-between" wrap="nowrap" gap="xs">
              <div style={{ minWidth: 0 }}>
                <AnchorLink
                  to="/discipulado/$id/niveles/$levelId"
                  params={{ id: String(e.level.course.id), levelId: String(e.level.id) }}
                  fw={500}
                >
                  {e.level.course.name}
                </AnchorLink>
                <Text size="xs" c="dimmed">
                  {e.level.name} ·{' '}
                  {e.status === 'completed'
                    ? t('enrollments.completedOn', { date: formatDate(e.completedAt) })
                    : e.status === 'dropped'
                      ? t('enrollments.droppedOn', { date: formatDate(e.droppedAt) })
                      : t('enrollments.since', { date: formatDate(e.enrolledAt) })}
                  {e.progress.pct !== null ? ` · ${t('progress.short', { pct: e.progress.pct })}` : ''}
                </Text>
              </div>
              <Badge variant="light" color={STATUS_COLORS[e.status]} style={{ flexShrink: 0 }}>
                {t(`person.status.${e.status}`)}
              </Badge>
            </Group>
          </Fragment>
        ))}
      </Stack>
    </Card>
  );
}
