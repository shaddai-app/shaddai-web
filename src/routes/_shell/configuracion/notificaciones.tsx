import { Card, Divider, Group, Loader, Stack, Switch, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { notificationsApi, type NotificationPref } from '../../../api/notifications';
import { requireChurch } from '../../../auth/guards';
import { FormError } from '../../../components/FormError';
import { errorMessage } from '../../../i18n/errors';
import { PageHeader } from '../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/configuracion/notificaciones')({
  beforeLoad: ({ context }) => requireChurch(context.me),
  component: NotificationPrefsPage,
});

const PREFS_KEY = ['notifications', 'prefs'];

function NotificationPrefsPage() {
  const { t } = useTranslation(['notifications', 'common']);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: PREFS_KEY, queryFn: notificationsApi.prefs });
  const save = useMutation({
    mutationFn: (pref: Partial<NotificationPref>) => notificationsApi.setPrefs([pref]),
    // Se ve el cambio al instante; si falla, vuelve atrás.
    onMutate: async (pref) => {
      await queryClient.cancelQueries({ queryKey: PREFS_KEY });
      const previous = queryClient.getQueryData<{ items: NotificationPref[] }>(PREFS_KEY);
      if (previous) {
        queryClient.setQueryData(PREFS_KEY, {
          items: previous.items.map((p) => (p.type === pref.type ? { ...p, ...pref } : p)),
        });
      }
      return { previous };
    },
    onError: (err, _pref, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(PREFS_KEY, ctx.previous);
      notifications.show({ color: 'red', message: errorMessage(err) });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(PREFS_KEY, data);
      notifications.show({ color: 'teal', message: t('prefs.saved') });
    },
  });

  return (
    <>
      <PageHeader title={t('prefs.title')} description={t('prefs.description')} />
      {query.isPending ? (
        <Loader />
      ) : query.isError ? (
        <FormError error={query.error} />
      ) : (
        <Card withBorder radius="lg" maw={720}>
          <Stack gap="sm">
            {query.data.items.map((p, i) => (
              <Fragment key={p.type}>
                {i > 0 && <Divider />}
                <Group justify="space-between" align="flex-start" gap="md">
                  <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                    <Text fw={500}>{t(`prefs.types.${p.type}.label`)}</Text>
                    <Text size="sm" c="dimmed">
                      {t(`prefs.types.${p.type}.hint`)}
                    </Text>
                  </div>
                  <Group gap="lg" wrap="nowrap">
                    <Switch
                      label={t('prefs.inApp')}
                      checked={p.inApp}
                      onChange={(e) => save.mutate({ type: p.type, inApp: e.currentTarget.checked })}
                    />
                    <Switch
                      label={t('prefs.email')}
                      checked={p.email}
                      onChange={(e) => save.mutate({ type: p.type, email: e.currentTarget.checked })}
                    />
                  </Group>
                </Group>
              </Fragment>
            ))}
          </Stack>
        </Card>
      )}
    </>
  );
}
