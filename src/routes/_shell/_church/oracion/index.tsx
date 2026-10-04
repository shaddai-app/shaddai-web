import { Button, Card, Center, Divider, Loader, Stack, Tabs, Text } from '@mantine/core';
import { useSuspenseQuery } from '@tanstack/react-query';
import { IconPlus } from '@tabler/icons-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { PRAYER_TABS, prayerApi, type PrayerTab } from '../../../../api/prayer';
import { meQuery } from '../../../../auth/session';
import { ShareFormCard } from '../../../../features/people/ShareFormCard';
import { FormError } from '../../../../components/FormError';
import { PaginationBar } from '../../../../components/PaginationBar';
import { PrayerItem } from '../../../../features/prayer/PrayerItem';
import { prayerContextQuery } from '../../../../features/prayer/queries';
import { usePrayerActions } from '../../../../features/prayer/usePrayerActions';
import { PageHeader } from '../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/oracion/')({
  validateSearch: z.object({
    pestana: z.enum(PRAYER_TABS).optional(),
    pagina: z.coerce.number().int().min(1).optional(),
  }),
  component: PrayerPage,
});

function PrayerPage() {
  const { t } = useTranslation('prayer');
  const { pestana = 'open', pagina = 1 } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: me } = useSuspenseQuery(meQuery());
  const context = useQuery(prayerContextQuery());
  const pastoral = context.data?.pastoral ?? false;
  // "Recibidas" (las del formulario público) solo para los pastores.
  const tabs = PRAYER_TABS.filter((tab) => tab !== 'received' || pastoral);
  const list = useQuery({
    queryKey: ['prayer', 'list', pestana, pagina],
    queryFn: () => prayerApi.list(pestana, pagina),
    placeholderData: keepPreviousData,
  });
  const { openNew, handlers, modals } = usePrayerActions({
    // La nueva se ve en "Mías" si se estaba mirando otra cosa que no la muestra.
    onCreated: () => {
      if (pestana === 'answered') void navigate({ search: { pestana: 'mine' }, replace: true });
    },
  });

  const items = list.data?.items ?? [];
  const content = list.isPending ? (
    <Center py="xl">
      <Loader />
    </Center>
  ) : items.length === 0 ? (
    <Text c="dimmed" ta="center" py="xl" maw={520} mx="auto">
      {t(`empty.${pestana}`)}
    </Text>
  ) : (
    <Card withBorder radius="lg">
      <Stack gap="md">
        {items.map((p, i) => (
          <Fragment key={p.id}>
            {i > 0 && <Divider />}
            <PrayerItem p={p} canModerate={pastoral} {...handlers(p)} />
          </Fragment>
        ))}
      </Stack>
    </Card>
  );

  return (
    <Stack gap="lg">
      <PageHeader
        title={t('title')}
        description={pastoral ? t('descriptionPastoral') : t('description')}
        actions={
          <Button leftSection={<IconPlus size={18} />} onClick={openNew}>
            {t('new')}
          </Button>
        }
      />
      <FormError error={list.error} />
      <Tabs
        value={pestana}
        onChange={(v) => void navigate({ search: { pestana: (v ?? 'open') as PrayerTab }, replace: true })}
      >
        <Tabs.List style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
          {tabs.map((tab) => (
            <Tabs.Tab key={tab} value={tab}>
              {t(`tabs.${tab}`)}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>
      {pestana === 'received' && me.account && (
        <ShareFormCard
          slug={me.account.slug}
          path="orar"
          title={t('share.title')}
          body={t('share.body')}
          openLabel={t('share.open')}
        />
      )}
      {content}
      {list.data && (
        <PaginationBar
          page={list.data.page}
          pageSize={list.data.pageSize}
          total={list.data.total}
          onChange={(p) => void navigate({ search: (s) => ({ ...s, pagina: p }) })}
        />
      )}
      {modals}
    </Stack>
  );
}
