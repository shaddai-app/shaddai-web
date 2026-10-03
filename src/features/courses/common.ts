import { useQuery } from '@tanstack/react-query';
import { coursesApi } from '../../api/courses';

export const coursesKey = ['courses'] as const;

export const courseQuery = (id: number) => ({
  queryKey: [...coursesKey, 'detail', id],
  queryFn: () => coursesApi.get(id),
});

export function useCourse(id: number) {
  return useQuery({ ...courseQuery(id), enabled: Number.isInteger(id) && id > 0, retry: false });
}
