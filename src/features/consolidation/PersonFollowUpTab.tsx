import { Button, Card, Group, Loader, Progress, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { casesApi } from '../../api/consolidation';
import type { PersonDetail } from '../../api/people';
import { can } from '../../auth/permissions';
import { meQuery } from '../../auth/session';
import { FormError } from '../../components/FormError';
import { ButtonLink } from '../../components/links';
import { fullName } from '../people/format';
import { CaseStatusBadge, DueText } from './CaseBits';
import { FollowUpsPanel } from './FollowUps';
import { OpenCaseModal } from './OpenCaseModal';

/** Pestaña «Seguimiento» de la ficha: el caso de consolidación abierto y los seguimientos. */
export function PersonFollowUpTab({ person }: { person: PersonDetail }) {
  const { t } = useTranslation('consolidation');
  const queryClient = useQueryClient();
  const { data: me } = useSuspenseQuery(meQuery());
  const [opening, setOpening] = useState(false);
  const cases = useQuery({
    queryKey: ['consolidation', 'cases', { personId: person.id, status: 'open' }],
    queryFn: () => casesApi.list({ personId: person.id, status: 'open', pageSize: 1 }),
  });
  const followUps = useQuery({
    queryKey: ['consolidation', 'followUps', person.id],
    queryFn: () => casesApi.followUps(person.id).then((r) => r.items),
  });
  const canManage = can(me, 'consolidacion.gestionar');
  const open = cases.data?.items[0];

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
      <Card withBorder radius="lg">
        <Title order={3} size="h5" mb="sm">
          {t('person.caseTitle')}
        </Title>
        <FormError error={cases.error} />
        {cases.isPending ? (
          <Loader size="sm" />
        ) : open ? (
          <Stack gap="xs">
            <Group justify="space-between">
              <CaseStatusBadge status={open.status} />
              <Text size="xs" c="dimmed">
                {open.consolidator ? fullName(open.consolidator) : t('board.unassigned')}
              </Text>
            </Group>
            <Group gap="xs" wrap="nowrap">
              <Progress
                value={open.progress.total ? (open.progress.done / open.progress.total) * 100 : 0}
                radius="xl"
                style={{ flex: 1 }}
                aria-label={t('board.progress', open.progress)}
              />
              <Text size="xs" c="dimmed">
                {open.progress.done}/{open.progress.total}
              </Text>
            </Group>
            <DueText dueAt={open.currentStepDueAt} overdue={open.overdue} />
            <ButtonLink
              to="/consolidacion/$caseId"
              params={{ caseId: String(open.id) }}
              variant="light"
              size="compact-sm"
              mt={4}
            >
              {t('person.viewCase')}
            </ButtonLink>
          </Stack>
        ) : (
          <Stack gap="xs" align="flex-start">
            <Text size="sm" c="dimmed">
              {t('person.noCase')}
            </Text>
            {canManage && (
              <Button size="compact-sm" leftSection={<IconPlus size={14} />} onClick={() => setOpening(true)}>
                {t('cases.open')}
              </Button>
            )}
          </Stack>
        )}
      </Card>
      {followUps.isPending ? (
        <Loader size="sm" />
      ) : followUps.isError ? (
        <FormError error={followUps.error} />
      ) : (
        <FollowUpsPanel
          personId={person.id}
          items={followUps.data}
          canAdd={canManage}
          onChange={(items) => {
            queryClient.setQueryData(['consolidation', 'followUps', person.id], items);
            void queryClient.invalidateQueries({ queryKey: ['consolidation', 'tasks'] });
          }}
        />
      )}
      <OpenCaseModal
        opened={opening}
        canAssign={can(me, 'consolidacion.asignar')}
        person={person}
        onClose={() => setOpening(false)}
        onOpened={() => {
          setOpening(false);
          notifications.show({ color: 'teal', message: t('cases.opened') });
          void queryClient.invalidateQueries({ queryKey: ['consolidation'] });
        }}
      />
    </SimpleGrid>
  );
}
