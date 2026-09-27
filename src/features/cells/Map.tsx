import { Alert, Button, Group, Stack, Text, TextInput, useComputedColorScheme } from '@mantine/core';
import { IconCurrentLocation, IconMapPin, IconSearch } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { geocodeApi, type GeocodeResult } from '../../api/cells';
import { errorMessage } from '../../i18n/errors';
import classes from './map.module.css';
import { DEFAULT_CENTER, usePinIcon, type LatLng } from './map-utils';

/** Leaflet calcula mal el tamaño si el mapa nace dentro de un modal animado. */
function FixSize() {
  const map = useMap();
  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 250);
    return () => window.clearTimeout(id);
  }, [map]);
  return null;
}

export function BaseMap({
  center,
  zoom = 13,
  height = 320,
  preview = false,
  children,
}: {
  center: LatLng;
  zoom?: number;
  height?: number | string;
  /** Mapa de muestra dentro de una página: no captura el scroll ni el arrastre con el dedo. */
  preview?: boolean;
  children?: ReactNode;
}) {
  const scheme = useComputedColorScheme('light');
  return (
    <div className={scheme === 'dark' ? classes.dark : undefined}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        className={classes.map}
        style={{ height }}
        scrollWheelZoom={!preview}
        dragging={!(preview && L.Browser.mobile)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FixSize />
        {children}
      </MapContainer>
    </div>
  );
}

/** Encuadra el mapa para que entren todos los puntos. */
export function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  const key = points.map((p) => `${p.lat},${p.lng}`).join('|');
  useEffect(() => {
    const [first] = points;
    if (!first) return;
    if (points.length === 1) map.setView([first.lat, first.lng], 15);
    else map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [32, 32] });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo cuando cambian los puntos
  }, [key, map]);
  return null;
}

function Recenter({ point }: { point: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.setView([point.lat, point.lng], Math.max(map.getZoom(), 16));
  }, [point, map]);
  return null;
}

function ClickToPlace({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

const round = (v: number) => Math.round(v * 1e6) / 1e6;

/**
 * Elegir la ubicación de una célula: buscar la dirección (si hay proveedor de geocodificación),
 * tocar el mapa o arrastrar el pin para ajustarlo a la casa exacta.
 */
export function MapPicker({
  value,
  onChange,
  address,
  near,
}: {
  value: LatLng | null;
  onChange: (p: LatLng | null) => void;
  /** Dirección cargada en el formulario: se ofrece como búsqueda. */
  address?: string;
  /** Sin ubicación todavía, el mapa arranca acá (ej. la célula madre al multiplicar). */
  near?: LatLng | null;
}) {
  const { t } = useTranslation('cells');
  const icon = usePinIcon(null);
  const status = useQuery({
    queryKey: ['geocode', 'status'],
    queryFn: geocodeApi.status,
    staleTime: Infinity,
  });
  const [q, setQ] = useState('');
  const [results, setResults] = useState<GeocodeResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focus, setFocus] = useState<LatLng | null>(null);

  const place = (p: LatLng) => {
    const rounded = { lat: round(p.lat), lng: round(p.lng) };
    onChange(rounded);
    return rounded;
  };

  const search = async () => {
    const text = (q || address || '').trim();
    if (text.length < 3) return;
    setSearching(true);
    setError(null);
    try {
      const { items } = await geocodeApi.search(text);
      setResults(items);
      const [only] = items;
      if (items.length === 1 && only) setFocus(place(only));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSearching(false);
    }
  };

  return (
    <Stack gap="xs">
      {status.data?.enabled ? (
        <Group gap="xs" align="flex-end" wrap="nowrap">
          <TextInput
            style={{ flex: 1 }}
            label={t('map.search')}
            placeholder={address || t('map.searchPlaceholder')}
            value={q}
            onChange={(e) => setQ(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void search();
              }
            }}
            leftSection={<IconSearch size={16} />}
          />
          <Button variant="default" onClick={() => void search()} loading={searching}>
            {t('map.find')}
          </Button>
        </Group>
      ) : (
        <Text size="xs" c="dimmed">
          {t('map.manualHint')}
        </Text>
      )}
      {error && (
        <Alert color="red" variant="light" p="xs">
          {error}
        </Alert>
      )}
      {results && results.length !== 1 && (
        <Stack gap={4}>
          {results.length === 0 ? (
            <Text size="sm" c="dimmed">
              {t('map.noResults')}
            </Text>
          ) : (
            results.map((r) => (
              <Button
                key={`${r.lat},${r.lng}`}
                variant="subtle"
                size="compact-sm"
                justify="flex-start"
                leftSection={<IconMapPin size={14} />}
                onClick={() => {
                  setFocus(place(r));
                  setResults(null);
                }}
                styles={{ label: { whiteSpace: 'normal', textAlign: 'left' } }}
              >
                {r.label}
              </Button>
            ))
          )}
        </Stack>
      )}
      <BaseMap center={value ?? near ?? DEFAULT_CENTER} zoom={value ? 16 : near ? 15 : 11} height={280}>
        <ClickToPlace onPick={place} />
        <Recenter point={focus} />
        {value && (
          <Marker
            position={[value.lat, value.lng]}
            icon={icon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const ll = (e.target as L.Marker).getLatLng();
                place({ lat: ll.lat, lng: ll.lng });
              },
            }}
          />
        )}
      </BaseMap>
      <Group justify="space-between" gap="xs">
        <Text size="xs" c="dimmed">
          {value ? t('map.dragHint') : t('map.tapHint')}
        </Text>
        <Group gap="xs">
          {'geolocation' in navigator && (
            <Button
              variant="subtle"
              size="compact-sm"
              leftSection={<IconCurrentLocation size={14} />}
              onClick={() =>
                navigator.geolocation.getCurrentPosition(
                  (pos) => setFocus(place({ lat: pos.coords.latitude, lng: pos.coords.longitude })),
                  () => setError(t('map.geolocationFailed')),
                  { enableHighAccuracy: true, timeout: 10_000 },
                )
              }
            >
              {t('map.here')}
            </Button>
          )}
          {value && (
            <Button variant="subtle" color="gray" size="compact-sm" onClick={() => onChange(null)}>
              {t('map.clear')}
            </Button>
          )}
        </Group>
      </Group>
    </Stack>
  );
}
