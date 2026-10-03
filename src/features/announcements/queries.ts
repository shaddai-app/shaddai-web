import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { announcementsApi, type Audience } from '../../api/announcements';

export const announcementsFeedQuery = (page = 1, pageSize = 10) => ({
  queryKey: ['announcements', 'feed', page, pageSize],
  queryFn: () => announcementsApi.feed(page, pageSize),
});

export const audienceOptionsQuery = () => ({
  queryKey: ['announcements', 'audience-options'],
  queryFn: announcementsApi.audienceOptions,
});

/** "Para todos" o los nombres de roles, ministerios y sedes de la audiencia. */
export function useAudienceLabel(enabled: boolean) {
  const { t } = useTranslation('announcements');
  const options = useQuery({ ...audienceOptionsQuery(), enabled });
  return (audiences: Audience[] = []) => {
    if (!audiences.length) return t('everyone');
    const names = {
      role: options.data?.roles,
      ministry: options.data?.ministries,
      campus: options.data?.campuses,
    };
    return audiences
      .map((a) => names[a.kind]?.find((o) => o.id === a.refId)?.name)
      .filter(Boolean)
      .join(', ');
  };
}
