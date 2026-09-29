import {
  IconHeartHandshake,
  IconMicrophone2,
  IconMoodKid,
  IconUsersGroup,
  IconDeviceDesktop,
  type Icon,
} from '@tabler/icons-react';
import type { MinistryKind } from '../../api/ministries';

export const KIND_ICONS: Record<MinistryKind, Icon> = {
  general: IconUsersGroup,
  worship: IconMicrophone2,
  tech: IconDeviceDesktop,
  kids: IconMoodKid,
  ushers: IconHeartHandshake,
};

/** Colores de Mantine para identificar ministerios (mismo formato que acepta la API). */
export const MINISTRY_COLORS = [
  'blue',
  'teal',
  'grape',
  'orange',
  'red',
  'pink',
  'indigo',
  'cyan',
  'green',
  'yellow',
  'violet',
  'gray',
] as const;

export const ministriesKey = ['ministries'] as const;
export const ministryKey = (id: number) => ['ministries', 'detail', id] as const;

/** Mueve un elemento una posición (para reordenar los puestos). */
export function moveItem<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const copy = list.slice();
  [copy[index], copy[target]] = [copy[target]!, copy[index]!];
  return copy;
}
