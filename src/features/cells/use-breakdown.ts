import { useTranslation } from 'react-i18next';

/** «3 integrantes · 1 visita · 2 niños», con plural correcto en cada parte. */
export function useBreakdown() {
  const { t } = useTranslation('cells');
  return (x: { members: number; visitors: number; children: number }) =>
    [
      t('report.counts.members', { count: x.members }),
      t('report.counts.visitors', { count: x.visitors }),
      t('report.counts.children', { count: x.children }),
    ].join(' · ');
}
