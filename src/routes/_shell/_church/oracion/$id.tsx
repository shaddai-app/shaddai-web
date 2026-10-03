import { Card, Center, Loader, Stack } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { prayerApi } from '../../../../api/prayer';
import { FormError } from '../../../../components/FormError';
import { AnchorLink } from '../../../../components/links';
import { PrayerItem } from '../../../../features/prayer/PrayerItem';
import { prayerContextQuery } from '../../../../features/prayer/queries';
import { usePrayerActions } from '../../../../features/prayer/usePrayerActions';

export const Route = createFileRoute('/_shell/_church/oracion/$id')({
  component: PrayerRequestPage,
});

// Detalle de una petición (los avisos del centro de notificaciones llevan acá).
function PrayerRequestPage() {
  const { t } = useTranslation('prayer');
  const id = Number(Route.useParams().id);
  const navigate = useNavigate();
  const context = useQuery(prayerContextQuery());
  const request = useQuery({
    queryKey: ['prayer', 'detail', id],
    queryFn: () => prayerApi.get(id),
    enabled: Number.isInteger(id) && id > 0,
    retry: false,
  });
  const { handlers, modals } = usePrayerActions({ onDeleted: () => void navigate({ to: '/oracion' }) });

  return (
    <Stack gap="md" maw={820}>
      <AnchorLink to="/oracion" size="sm">
        ← {t('backToList')}
      </AnchorLink>
      <FormError error={request.error} />
      {request.isPending && request.fetchStatus !== 'idle' ? (
        <Center py="xl">
          <Loader />
        </Center>
      ) : request.data ? (
        <Card withBorder radius="lg">
          <PrayerItem
            p={request.data}
            full
            canModerate={context.data?.pastoral ?? false}
            {...handlers(request.data)}
          />
        </Card>
      ) : null}
      {modals}
    </Stack>
  );
}
