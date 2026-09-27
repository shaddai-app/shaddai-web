import { ColorSwatch, Group, Loader, Select, Stack, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Marker, Popup } from 'react-leaflet';
import { z } from 'zod';
import { cellsApi, type CellMapItem } from '../../../../api/cells';
import { requirePermission } from '../../../../auth/guards';
import { FormError } from '../../../../components/FormError';
import { AnchorLink } from '../../../../components/links';
import { BaseMap, FitBounds } from '../../../../features/cells/Map';
import { DEFAULT_CENTER, usePinIcon } from '../../../../features/cells/map-utils';
import {
  meetingLabel,
  networksQuery,
  useStructureLabels,
  zonesQuery,
} from '../../../../features/cells/structure';
import { fullName } from '../../../../features/people/format';
import { PageHeader } from '../../../../layout/PageHeader';

const search = z.object({
  networkId: z.number().int().optional(),
  zoneId: z.number().int().optional(),
});

export const Route = createFileRoute('/_shell/_church/celulas/mapa')({
  validateSearch: search,
  beforeLoad: ({ context }) => requirePermission(context.me, 'celulas.ver'),
  component: CellsMapPage,
});

function CellMarker({ cell }: { cell: CellMapItem }) {
  const { t } = useTranslation('cells');
  const icon = usePinIcon(cell.zone.network.color);
  return (
    <Marker position={[cell.lat, cell.lng]} icon={icon} title={cell.name}>
      <Popup>
        <Stack gap={2}>
          <AnchorLink to="/celulas/$id" params={{ id: String(cell.id) }} fw={600} size="sm">
            {cell.name}
          </AnchorLink>
          <Text size="xs">{meetingLabel(cell.meetingDay, cell.meetingTime)}</Text>
          <Text size="xs">
            {t('form.leader')}: {fullName(cell.leader)}
          </Text>
          <Text size="xs" c="dimmed">
            {[cell.zone.network.name, cell.zone.name, cell.neighborhood].filter(Boolean).join(' · ')}
          </Text>
          {cell.approximate && (
            <Text size="xs" c="dimmed" fs="italic">
              {t('map.approximate')}
            </Text>
          )}
        </Stack>
      </Popup>
    </Marker>
  );
}

function CellsMapPage() {
  const { t } = useTranslation('cells');
  const params = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const labels = useStructureLabels();
  const networks = useQuery(networksQuery());
  const zones = useQuery(zonesQuery());
  const map = useQuery({
    queryKey: ['cells', 'map', params],
    queryFn: () => cellsApi.map(params).then((r) => r.items),
  });

  const setSearch = (patch: Partial<z.infer<typeof search>>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });
  const items = map.data ?? [];
  // Leyenda: una entrada por red presente en el mapa.
  const legend = [...new Map(items.map((c) => [c.zone.network.id, c.zone.network])).values()];
  const zoneOptions = (zones.data ?? [])
    .filter((z) => !params.networkId || z.network.id === params.networkId)
    .map((z) => ({ value: String(z.id), label: z.name }));

  return (
    <>
      <PageHeader title={t('map.title')} description={t('map.description')} />
      <Stack gap="md">
        <Group gap="sm" wrap="wrap">
          {(networks.data?.length ?? 0) > 1 && (
            <Select
              aria-label={labels.network}
              placeholder={t('list.all', { label: labels.network })}
              clearable
              data={(networks.data ?? []).map((n) => ({ value: String(n.id), label: n.name }))}
              value={params.networkId ? String(params.networkId) : null}
              onChange={(v) => setSearch({ networkId: v ? Number(v) : undefined, zoneId: undefined })}
              w={{ base: '100%', xs: 200 }}
            />
          )}
          {zoneOptions.length > 1 && (
            <Select
              aria-label={labels.zone}
              placeholder={t('list.all', { label: labels.zone })}
              clearable
              searchable
              data={zoneOptions}
              value={params.zoneId ? String(params.zoneId) : null}
              onChange={(v) => setSearch({ zoneId: v ? Number(v) : undefined })}
              w={{ base: '100%', xs: 200 }}
            />
          )}
          {map.isFetching && <Loader size="sm" />}
        </Group>
        <FormError error={map.error} />
        <BaseMap center={DEFAULT_CENTER} zoom={11} height="min(65vh, 620px)">
          <FitBounds points={items} />
          {items.map((c) => (
            <CellMarker key={c.id} cell={c} />
          ))}
        </BaseMap>
        <Group justify="space-between" gap="sm">
          <Group gap="md">
            {legend.map((n) => (
              <Group key={n.id} gap={6}>
                <ColorSwatch
                  color={`var(--mantine-color-${n.color ?? 'gray'}-6)`}
                  size={12}
                  withShadow={false}
                />
                <Text size="xs">{n.name}</Text>
              </Group>
            ))}
          </Group>
          <Text size="xs" c="dimmed">
            {map.isSuccess && t('map.count', { count: items.length })}
          </Text>
        </Group>
      </Stack>
    </>
  );
}
