import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { catalogsApi, campusesApi, tagsApi, type CatalogRef, type CatalogType } from '../../api/people';

/** Colores de Mantine que se ofrecen para estados, hitos y etiquetas. */
export const CATALOG_COLORS = [
  'gray',
  'red',
  'pink',
  'grape',
  'violet',
  'indigo',
  'blue',
  'cyan',
  'teal',
  'green',
  'lime',
  'yellow',
  'orange',
] as const;

/**
 * Nombre visible de un ítem de catálogo: el que puso la iglesia o, si es del sistema y no lo
 * renombraron, la traducción de su systemKey.
 */
export function useCatalogLabel() {
  const { t, i18n } = useTranslation('people');
  return useCallback(
    (type: CatalogType, item: Pick<CatalogRef, 'name' | 'systemKey'> | null | undefined) => {
      if (!item) return '';
      if (item.name) return item.name;
      const key = `catalog.${type}.${item.systemKey}`;
      return i18n.exists(key, { ns: 'people' }) ? t(key as never) : (item.systemKey ?? '');
    },
    [t, i18n],
  );
}

export const catalogQuery = (type: CatalogType, includeInactive = false) => ({
  queryKey: ['catalog', type, { includeInactive }],
  queryFn: () => catalogsApi.list(type, includeInactive).then((r) => r.items),
  staleTime: 5 * 60_000,
});

export const tagsQuery = () => ({
  queryKey: ['tags'],
  queryFn: () => tagsApi.list().then((r) => r.items),
  staleTime: 60_000,
});

export const campusesQuery = () => ({
  queryKey: ['campuses'],
  queryFn: () => campusesApi.list().then((r) => r.items),
  staleTime: 5 * 60_000,
});

/** Opciones { value, label } de un catálogo, para Select/MultiSelect. */
export function useCatalogOptions(type: CatalogType) {
  const label = useCatalogLabel();
  const { data = [] } = useQuery(catalogQuery(type));
  return data.map((item) => ({ value: String(item.id), label: label(type, item) }));
}
