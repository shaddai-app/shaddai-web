import { useCallback } from 'react';
import type { InventoryListItem, ItemStatus } from '../../api/inventory';
import { useCatalogLabel } from '../people/catalog';

export const STATUS_COLORS: Record<ItemStatus, string> = {
  ok: 'teal',
  faulty: 'red',
  repair: 'orange',
  retired: 'gray',
};

/** Nombre visible de la categoría (la de la iglesia o la traducción de la del sistema). */
export function useCategoryLabel() {
  const label = useCatalogLabel();
  return useCallback(
    (category: InventoryListItem['category']) => label('inventory_category', category),
    [label],
  );
}

/** Código del QR de una etiqueta de inventario (/i/<token>), o null si es otro QR. */
export function qrTokenFrom(text: string): string | null {
  try {
    const url = new URL(text, window.location.origin);
    const match = /^\/i\/([A-Za-z0-9_-]{22})$/.exec(url.pathname);
    return match ? match[1]! : null;
  } catch {
    return null;
  }
}

interface DetectedCode {
  rawValue: string;
}
interface Detector {
  detect(source: HTMLVideoElement): Promise<DetectedCode[]>;
}
type DetectorCtor = new (opts: { formats: string[] }) => Detector;

/** BarcodeDetector del navegador (Chrome/Edge); Safari no lo tiene. */
export const detectorCtor = () => (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;

/** Si se puede leer un QR con la cámara desde la app. */
export const canScan = () =>
  typeof window !== 'undefined' && !!detectorCtor() && !!navigator.mediaDevices?.getUserMedia;
