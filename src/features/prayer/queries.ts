import { prayerApi } from '../../api/prayer';

export const prayerContextQuery = () => ({
  queryKey: ['prayer', 'context'],
  queryFn: prayerApi.context,
  staleTime: 60_000,
});
