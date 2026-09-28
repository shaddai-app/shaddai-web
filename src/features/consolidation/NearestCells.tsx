import { Card, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { nearestApi } from '../../api/cells';
import { ApiError } from '../../api/http';
import { AnchorLink } from '../../components/links';
import { meetingLabel } from '../cells/structure';
import { fullName } from '../people/format';
import { ContactButtons } from './CaseBits';

/** Células activas más cercanas a la casa de la persona (para invitarla). */
export function NearestCells({ personId }: { personId: number }) {
  const { t } = useTranslation('consolidation');
  const query = useQuery({
    queryKey: ['cells', 'nearest', personId],
    queryFn: () => nearestApi.forPerson(personId),
    retry: false,
  });
  // Sin coordenadas en la ficha, o sin permiso para ver la dirección: se explica en vez de fallar.
  const code = query.error instanceof ApiError ? query.error.code : null;
  return (
    <Card withBorder radius="lg">
      <Title order={3} size="h5" mb="sm">
        {t('nearest.title')}
      </Title>
      {query.isPending ? (
        <Loader size="sm" />
      ) : code === 'LOCATION_REQUIRED' ? (
        <Text size="sm" c="dimmed">
          {t('nearest.noLocation')}
        </Text>
      ) : query.isError ? (
        <Text size="sm" c="dimmed">
          {t('nearest.unavailable')}
        </Text>
      ) : query.data.items.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t('nearest.none')}
        </Text>
      ) : (
        <Stack gap="sm">
          {query.data.items.map((c) => (
            <Group key={c.id} justify="space-between" wrap="nowrap" gap="sm">
              <div style={{ minWidth: 0 }}>
                <AnchorLink to="/celulas/$id" params={{ id: String(c.id) }} size="sm" fw={500}>
                  {c.name}
                </AnchorLink>
                <Text size="xs" c="dimmed" truncate>
                  {t('nearest.distance', { km: c.distanceKm })} · {meetingLabel(c.meetingDay, c.meetingTime)}{' '}
                  · {fullName(c.leader)}
                </Text>
              </div>
              <ContactButtons phone={c.leader.phone} firstName={c.leader.firstName} />
            </Group>
          ))}
        </Stack>
      )}
    </Card>
  );
}
