import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

export const fullName = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`;

/** Edad en años cumplidos a partir de "YYYY-MM-DD". */
export function ageOf(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  return dayjs().diff(dayjs(birthDate.slice(0, 10)), 'year');
}

/** Fecha pura del servidor ("YYYY-MM-DD") en formato local, sin corrimiento por zona horaria. */
export const formatDate = (d: string | null | undefined) => (d ? dayjs(d.slice(0, 10)).format('L') : null);

/** Hoy como "YYYY-MM-DD" (para inputs de fecha y máximos). */
export const todayIso = () => dayjs().format('YYYY-MM-DD');

/** "34 años" o null. */
export function useAgeLabel() {
  const { t } = useTranslation('people');
  return (birthDate: string | null | undefined) => {
    const age = ageOf(birthDate);
    return age === null ? null : t('age', { count: age });
  };
}
