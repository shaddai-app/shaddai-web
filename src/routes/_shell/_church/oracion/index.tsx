import { Button, Card, Center, Divider, Loader, Stack, Tabs, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { PRAYER_TABS, prayerApi, type PrayerTab } from '../../../../api/prayer';
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
  const context = useQuery(prayerContextQuery());
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
    <Text c="dimmed" ta="center" py="xl">
      {t(`empty.${pestana}`)}
    </Text>
  ) : (
    <Card withBorder radius="lg">
      <Stack gap="md">
        {items.map((p, i) => (
          <Fragment key={p.id}>
            {i > 0 && <Divider />}
            <PrayerItem p={p} canModerate={context.data?.pastoral ?? false} {...handlers(p)} />
          </Fragment>
        ))}
      </Stack>
    </Card>
  );

  return (
    <Stack gap="lg" maw={820}>
      <PageHeader
        title={t('title')}
        description={context.data?.pastoral ? t('descriptionPastoral') : t('description')}
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
        <Tabs.List>
          {PRAYER_TABS.map((tab) => (
            <Tabs.Tab key={tab} value={tab}>
              {t(`tabs.${tab}`)}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>
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
