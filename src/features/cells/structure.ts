import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { accountApi } from '../../api/admin';
import { networksApi, zonesApi, type CellStatus } from '../../api/cells';

export const networksQuery = () => ({
  queryKey: ['networks'],
  queryFn: () => networksApi.list().then((r) => r.items),
  staleTime: 60_000,
});

export const zonesQuery = () => ({
  queryKey: ['zones'],
  queryFn: () => zonesApi.list().then((r) => r.items),
  staleTime: 60_000,
});

/**
 * Cómo llama la iglesia a los niveles que agrupan células (configurable en la cuenta).
 * Devuelve el nombre en singular, por ejemplo «Red» y «Zona».
 */
export function useStructureLabels() {
  const { t } = useTranslation('cells');
  const account = useQuery({ queryKey: ['account'], queryFn: accountApi.get, staleTime: 5 * 60_000 });
  const custom = account.data?.structureLabels;
  return {
    network: custom?.network || t('structure.network'),
    zone: custom?.zone || t('structure.zone'),
    /** Plural para títulos: solo si la iglesia no los renombró (no sabemos pluralizar su nombre). */
    networks: custom?.network || t('structure.networks'),
    zones: custom?.zone || t('structure.zones'),
  };
}

/** Días de la semana (0 = domingo) en el idioma actual, empezando por el primer día de la cuenta. */
export function weekdayOptions(weekStartsOn = 1) {
  return Array.from({ length: 7 }, (_, i) => (i + weekStartsOn) % 7).map((d) => ({
    value: String(d),
    label: capitalize(dayjs().day(d).format('dddd')),
  }));
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** «Miércoles 20:00» */
export const meetingLabel = (day: number, time: string) =>
  `${capitalize(dayjs().day(day).format('dddd'))} ${time}`;

export const CELL_STATUS_COLORS: Record<CellStatus, string> = {
  active: 'teal',
  paused: 'yellow',
  closed: 'gray',
  multiplied: 'marfil',
};

/** Colores de Mantine para identificar redes (mismo formato que acepta la API). */
export const NETWORK_COLORS = [
  'blue',
  'teal',
  'grape',
  'orange',
  'red',
  'pink',
  'indigo',
  'cyan',
  'green',
  'lime',
  'yellow',
  'violet',
] as const;
