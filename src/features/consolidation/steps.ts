import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { casesApi, stepsApi, type ConsolidationStep } from '../../api/consolidation';

export const stepsQuery = (includeInactive = false) => ({
  queryKey: ['consolidation', 'steps', { includeInactive }],
  queryFn: () => stepsApi.list(includeInactive).then((r) => r.items),
  staleTime: 60_000,
});

export const consolidatorsQuery = () => ({
  queryKey: ['consolidation', 'consolidators'],
  queryFn: () => casesApi.consolidators().then((r) => r.items),
  staleTime: 60_000,
});

export const myTasksQuery = () => ({
  queryKey: ['consolidation', 'tasks'],
  queryFn: casesApi.myTasks,
  staleTime: 30_000,
});

/** Nombre visible del paso: el que puso la iglesia o la traducción del paso por defecto. */
export function useStepLabel() {
  const { t, i18n } = useTranslation('consolidation');
  return useCallback(
    (step: Pick<ConsolidationStep, 'name' | 'systemKey'> | null | undefined) => {
      if (!step) return '';
      if (step.name) return step.name;
      const key = `steps.defaults.${step.systemKey}`;
      return i18n.exists(key, { ns: 'consolidation' }) ? t(key as never) : (step.systemKey ?? '');
    },
    [t, i18n],
  );
}

/** wa.me solo con teléfonos en formato internacional (+54 9 11 …), igual que la ficha de persona. */
export function whatsappHref(phone: string | null | undefined, text?: string) {
  if (!phone?.startsWith('+')) return null;
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
