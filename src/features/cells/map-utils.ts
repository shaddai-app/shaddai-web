import L from 'leaflet';
import { useMemo } from 'react';
import classes from './map.module.css';

export type LatLng = { lat: number; lng: number };

/** Centro por defecto cuando no hay puntos: Buenos Aires. */
export const DEFAULT_CENTER: LatLng = { lat: -34.6037, lng: -58.3816 };

/** Pin de color (divIcon: evita las imágenes por defecto de Leaflet, que Vite no resuelve). */
export function usePinIcon(color: string | null | undefined) {
  const fill = color ? `var(--mantine-color-${color}-6)` : 'var(--mantine-primary-color-filled)';
  return useMemo(
    () =>
      L.divIcon({
        className: '',
        html: `<div class="${classes.pin}" style="background:${fill}"></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -26],
      }),
    [fill],
  );
}
