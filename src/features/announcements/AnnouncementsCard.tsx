import { Card, Divider, Group, Stack, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { AnchorLink } from '../../components/links';
import { AnnouncementItem } from './AnnouncementItem';
import { announcementsFeedQuery } from './queries';

/** Los últimos anuncios para el usuario (fijados primero), en el inicio. Sin anuncios no se muestra. */
export function AnnouncementsCard() {
  const { t } = useTranslation('announcements');
  const feed = useQuery(announcementsFeedQuery(1, 3));
  if (!feed.data?.items.length) return null;
  return (
    <Card withBorder radius="lg">
      <Group justify="space-between" mb="sm">
        <Title order={3} size="h5">
          {t('title')}
        </Title>
        {feed.data.total > feed.data.items.length && (
          <AnchorLink to="/anuncios" size="sm">
            {t('seeAll', { count: feed.data.total })}
          </AnchorLink>
        )}
      </Group>
      <Stack gap="sm">
        {feed.data.items.map((a, i) => (
          <Fragment key={a.id}>
            {i > 0 && <Divider />}
            <AnnouncementItem a={a} />
          </Fragment>
        ))}
      </Stack>
    </Card>
  );
}
