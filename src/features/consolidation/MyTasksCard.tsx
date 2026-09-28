import { Badge, Card, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AnchorLink } from '../../components/links';
import { formatDate, fullName } from '../people/format';
import { ContactButtons } from './CaseBits';
import { myTasksQuery } from './steps';

/** «Mis tareas» de consolidación: próximas acciones de hoy o vencidas y casos míos atrasados. */
export function MyTasksCard() {
  const { t } = useTranslation('consolidation');
  const tasks = useQuery(myTasksQuery());
  if (tasks.isError) return null;
  const empty = tasks.data && tasks.data.actions.length === 0 && tasks.data.overdueCases.length === 0;
  return (
    <Card withBorder radius="lg">
      <Group justify="space-between" mb="sm">
        <Title order={3} size="h5">
          {t('tasks.title')}
        </Title>
        <AnchorLink to="/consolidacion" search={{ filter: 'mine' }} size="sm">
          {t('tasks.board')}
        </AnchorLink>
      </Group>
      {tasks.isPending ? (
        <Loader size="sm" />
      ) : empty ? (
        <Text size="sm" c="dimmed">
          {t('tasks.empty')}
        </Text>
      ) : (
        <Stack gap="sm">
          {tasks.data.actions.map((a) => (
            <Group key={a.followUpId} justify="space-between" wrap="nowrap" gap="sm">
              <div style={{ minWidth: 0 }}>
                <AnchorLink to="/personas/$id" params={{ id: String(a.person.id) }} size="sm" fw={500}>
                  {fullName(a.person)}
                </AnchorLink>
                <Text size="xs" c={a.overdue ? 'red' : 'dimmed'} truncate>
                  {a.nextAction ?? t('followUps.contactAgain')} · {formatDate(a.nextActionAt)}
                </Text>
              </div>
              <ContactButtons phone={a.person.phone} firstName={a.person.firstName} />
            </Group>
          ))}
          {tasks.data.overdueCases.map((c) => (
            <Group key={c.id} justify="space-between" wrap="nowrap" gap="sm">
              <div style={{ minWidth: 0 }}>
                <AnchorLink to="/consolidacion/$caseId" params={{ caseId: String(c.id) }} size="sm" fw={500}>
                  {fullName(c.person)}
                </AnchorLink>
                <Group gap={6}>
                  <Badge size="xs" color="red" variant="light">
                    {t('tasks.stepOverdue')}
                  </Badge>
                  <Text size="xs" c="dimmed">
                    {formatDate(c.currentStepDueAt)}
                  </Text>
                </Group>
              </div>
              <ContactButtons phone={c.person.phone} firstName={c.person.firstName} />
            </Group>
          ))}
        </Stack>
      )}
    </Card>
  );
}
