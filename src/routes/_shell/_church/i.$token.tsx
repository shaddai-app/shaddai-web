import { Alert, Group, Loader, Stack, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { inventoryApi } from '../../../api/inventory';
import { requirePermission } from '../../../auth/guards';
import { AnchorLink } from '../../../components/links';

// Destino del QR de las etiquetas de inventario. Sin sesión, el login vuelve acá; sin permiso para
// ver el inventario, va a «Sin acceso».
export const Route = createFileRoute('/_shell/_church/i/$token')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'inventario.ver'),
  component: QrPage,
});

function QrPage() {
  const { t } = useTranslation('inventory');
  const { token } = Route.useParams();
  const query = useQuery({
    queryKey: ['inventory', 'qr', token],
    queryFn: () => inventoryApi.resolveQr(token),
    retry: false,
  });

  if (query.data) return <Navigate to="/inventario/$id" params={{ id: String(query.data.id) }} replace />;
  return (
    <Stack maw={520} gap="md">
      {query.isError ? (
        <>
          <Alert color="orange">{t('qr.notFound')}</Alert>
          <AnchorLink to="/inventario" size="sm">
            {t('qr.goToInventory')}
          </AnchorLink>
        </>
      ) : (
        <Group gap="sm">
          <Loader size="sm" />
          <Text c="dimmed">{t('qr.resolving')}</Text>
        </Group>
      )}
    </Stack>
  );
}
