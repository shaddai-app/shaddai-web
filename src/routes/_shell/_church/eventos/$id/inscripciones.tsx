import {
  ActionIcon,
  Badge,
  Button,
  Card,
  CopyButton,
  Group,
  Loader,
  Menu,
  Select,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconBan,
  IconCash,
  IconCheck,
  IconDots,
  IconFileSpreadsheet,
  IconLink,
  IconPlus,
} from '@tabler/icons-react';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { calendarApi, registrationsApi, type Registration } from '../../../../../api/calendar';
import { saveBlob } from '../../../../../api/people';
import { requirePermission } from '../../../../../auth/guards';
import { can } from '../../../../../auth/permissions';
import { meQuery } from '../../../../../auth/session';
import { FormError } from '../../../../../components/FormError';
import { AnchorLink } from '../../../../../components/links';
import { useWhenText } from '../../../../../features/calendar/common';
import { AddRegistrationModal, PaymentModal } from '../../../../../features/calendar/RegistrationModals';
import { useChurchCurrency, useMoney } from '../../../../../features/finance/common';
import { fullName } from '../../../../../features/people/format';
import { errorMessage } from '../../../../../i18n/errors';
import { PageHeader } from '../../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/eventos/$id/inscripciones')({
  validateSearch: z.object({
    fecha: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
      .optional(),
  }),
  beforeLoad: ({ context }) => requirePermission(context.me, 'eventos.inscripciones'),
  component: RegistrationsPage,
});

const STATUS_COLORS = { confirmed: 'teal', waitlist: 'yellow', cancelled: 'gray' } as const;

function RegistrationsPage() {
  const { t, i18n } = useTranslation(['calendar', 'common']);
  const id = Number(Route.useParams().id);
  const { fecha } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const money = useMoney();
  const currency = useChurchCurrency();
  const whenText = useWhenText();
  const { data: me } = useSuspenseQuery(meQuery());
  const event = useQuery({ queryKey: ['calendar', 'event', id], queryFn: () => calendarApi.event(id) });
  // Sin fecha elegida: la próxima (o la única).
  const occurrence = fecha ?? event.data?.upcoming[0]?.originalStart ?? event.data?.startsAt;
  const list = useQuery({
    queryKey: ['calendar', 'registrations', id, occurrence],
    queryFn: () => registrationsApi.list(id, occurrence!),
    enabled: Boolean(occurrence),
  });
  const [adding, setAdding] = useState(false);
  const [paying, setPaying] = useState<Registration | null>(null);
  const canPay = can(me, 'finanzas.registrar');
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['calendar', 'registrations', id] });

  if (event.isPending || (occurrence && list.isPending)) return <Loader />;
  if (event.isError) return <FormError error={event.error} />;
  const e = event.data;
  const data = list.data;
  const publicUrl = `${window.location.origin}/inscripcion/${me.account?.slug}/${e.id}`;
  const dateOptions = [
    ...(fecha && !e.upcoming.some((o) => o.originalStart === fecha)
      ? [{ value: fecha, label: dayjs(fecha).format('ddd L LT') }]
      : []),
    ...e.upcoming.map((o) => ({
      value: o.originalStart,
      label: `${dayjs(o.startsAt).format('ddd L LT')}${o.cancelled ? ` · ${t('cancelled')}` : ''}`,
    })),
  ];

  const cancel = (r: Registration) =>
    modals.openConfirmModal({
      title: t('registrations.cancelTitle', { name: r.name }),
      children: (
        <Text size="sm">
          {r.status === 'confirmed' && data?.waitlist
            ? t('registrations.cancelPromotes')
            : t('registrations.cancelBody')}
        </Text>
      ),
      labels: { confirm: t('registrations.cancel'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          const { promoted } = await registrationsApi.cancel(r.id);
          notifications.show({
            message: promoted.length
              ? t('registrations.promoted', { count: promoted.length })
              : t('registrations.cancelled'),
          });
          refresh();
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  return (
    <>
      <PageHeader
        title={t('registrations.title')}
        description={e.title}
        actions={
          e.registrationEnabled && (
            <Group gap="xs">
              {e.isPublic && (
                <CopyButton value={publicUrl}>
                  {({ copied, copy }) => (
                    <Button
                      variant="default"
                      leftSection={copied ? <IconCheck size={16} /> : <IconLink size={16} />}
                      onClick={copy}
                    >
                      {copied ? t('registrations.linkCopied') : t('registrations.copyLink')}
                    </Button>
                  )}
                </CopyButton>
              )}
              <Button
                leftSection={<IconPlus size={18} />}
                onClick={() => setAdding(true)}
                disabled={!occurrence || data?.occurrence.cancelled}
              >
                {t('registrations.add')}
              </Button>
            </Group>
          )
        }
      />
      <Stack gap="md" maw={820}>
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
          {e.recurrence ? (
            <Select
              label={t('registrations.date')}
              data={dateOptions}
              value={occurrence ?? null}
              onChange={(v) => v && void navigate({ search: { fecha: v }, replace: true })}
              allowDeselect={false}
              w={{ base: '100%', xs: 280 }}
            />
          ) : (
            <Text fw={500}>{data && whenText({ ...data.occurrence, allDay: e.allDay })}</Text>
          )}
          <AnchorLink
            to="/eventos/$id"
            params={{ id: String(e.id) }}
            search={occurrence ? { fecha: occurrence } : {}}
            size="sm"
          >
            {t('registrations.backToEvent')}
          </AnchorLink>
        </Group>
        <FormError error={list.error} />
        {!e.registrationEnabled && <Text c="dimmed">{t('registrations.disabled')}</Text>}
        {data && (
          <>
            <Card withBorder radius="lg">
              <Group gap="xl" wrap="wrap">
                <div>
                  <Text size="xs" c="dimmed">
                    {t('registrations.confirmed')}
                  </Text>
                  <Text fw={700} size="xl">
                    {data.capacity !== null
                      ? t('registrations.ofCapacity', { count: data.confirmed, capacity: data.capacity })
                      : data.confirmed}
                  </Text>
                </div>
                {data.capacity !== null && (
                  <div>
                    <Text size="xs" c="dimmed">
                      {t('registrations.available')}
                    </Text>
                    <Text fw={700} size="xl" c={data.full ? 'red' : 'teal'}>
                      {data.available}
                    </Text>
                  </div>
                )}
                {(data.waitlist > 0 || e.waitlistEnabled) && (
                  <div>
                    <Text size="xs" c="dimmed">
                      {t('registrations.waitlist')}
                    </Text>
                    <Text fw={700} size="xl">
                      {data.waitlist}
                    </Text>
                  </div>
                )}
                {e.price !== null && (
                  <div>
                    <Text size="xs" c="dimmed">
                      {t('registrations.price')}
                    </Text>
                    <Text fw={700} size="xl">
                      {money(e.price, currency)}
                    </Text>
                  </div>
                )}
              </Group>
            </Card>

            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                {t('registrations.count', {
                  count: data.items.filter((r) => r.status !== 'cancelled').length,
                })}
              </Text>
              <Button
                variant="subtle"
                size="compact-sm"
                leftSection={<IconFileSpreadsheet size={16} />}
                disabled={!data.items.length}
                onClick={async () => {
                  try {
                    saveBlob(
                      await registrationsApi.exportXlsx(e.id, occurrence!, i18n.resolvedLanguage ?? 'es'),
                      `${t('registrations.file')}-${occurrence!.slice(0, 10)}.xlsx`,
                    );
                  } catch (err) {
                    notifications.show({ color: 'red', message: errorMessage(err) });
                  }
                }}
              >
                Excel
              </Button>
            </Group>

            {data.items.length === 0 ? (
              <Text c="dimmed">{t('registrations.empty')}</Text>
            ) : (
              <Card withBorder radius="lg" p={0}>
                {data.items.map((r, i) => {
                  const waitPos =
                    r.status === 'waitlist'
                      ? data.items.filter((x) => x.status === 'waitlist').indexOf(r) + 1
                      : 0;
                  const owes = e.price !== null && r.status !== 'cancelled' && (r.paidAmount ?? 0) < e.price;
                  return (
                    <Group
                      key={r.id}
                      justify="space-between"
                      wrap="nowrap"
                      px="md"
                      py="sm"
                      gap="sm"
                      style={{
                        borderTop: i ? '1px solid var(--mantine-color-default-border)' : undefined,
                        opacity: r.status === 'cancelled' ? 0.55 : 1,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <Group gap={6} wrap="nowrap">
                          {r.person ? (
                            <AnchorLink
                              to="/personas/$id"
                              params={{ id: String(r.person.id) }}
                              size="sm"
                              fw={500}
                              truncate
                            >
                              {fullName(r.person)}
                            </AnchorLink>
                          ) : (
                            <Text
                              size="sm"
                              fw={500}
                              truncate
                              td={r.status === 'cancelled' ? 'line-through' : undefined}
                            >
                              {r.name}
                            </Text>
                          )}
                          {r.source === 'public' && (
                            <Tooltip label={t('registrations.fromWeb')}>
                              <Badge size="xs" variant="outline">
                                web
                              </Badge>
                            </Tooltip>
                          )}
                        </Group>
                        <Text size="xs" c="dimmed" truncate>
                          {[r.phone, r.email, r.notes].filter(Boolean).join(' · ') || '—'}
                        </Text>
                      </div>
                      <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
                        {r.paidAmount ? (
                          <Badge size="sm" color="teal" variant="light" leftSection={<IconCash size={12} />}>
                            {money(r.paidAmount, currency)}
                          </Badge>
                        ) : owes ? (
                          <Badge size="sm" color="orange" variant="light">
                            {t('registrations.unpaid')}
                          </Badge>
                        ) : null}
                        <Badge size="sm" color={STATUS_COLORS[r.status]} variant="light">
                          {r.status === 'waitlist'
                            ? t('registrations.waitPosition', { position: waitPos })
                            : t(`registrations.status.${r.status}`)}
                        </Badge>
                        {r.status !== 'cancelled' && (
                          <Menu position="bottom-end" withinPortal>
                            <Menu.Target>
                              <ActionIcon variant="subtle" color="gray" aria-label={t('common:actions.more')}>
                                <IconDots size={16} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              {canPay && (
                                <Menu.Item leftSection={<IconCash size={16} />} onClick={() => setPaying(r)}>
                                  {t('registrations.registerPayment')}
                                </Menu.Item>
                              )}
                              <Menu.Item
                                color="red"
                                leftSection={<IconBan size={16} />}
                                onClick={() => cancel(r)}
                              >
                                {t('registrations.cancel')}
                              </Menu.Item>
                            </Menu.Dropdown>
                          </Menu>
                        )}
                      </Group>
                    </Group>
                  );
                })}
              </Card>
            )}
          </>
        )}
      </Stack>
      {occurrence && (
        <AddRegistrationModal
          opened={adding}
          eventId={e.id}
          occurrence={occurrence}
          onClose={() => setAdding(false)}
          onSaved={(r) => {
            setAdding(false);
            notifications.show({
              color: r.status === 'waitlist' ? 'yellow' : 'teal',
              message: t(`registrations.added.${r.status as 'confirmed' | 'waitlist'}`),
            });
            refresh();
          }}
        />
      )}
      <PaymentModal
        registration={paying}
        price={e.price}
        onClose={() => setPaying(null)}
        onDone={() => {
          setPaying(null);
          notifications.show({ color: 'teal', message: t('registrations.paid') });
          refresh();
          void queryClient.invalidateQueries({ queryKey: ['finance'] });
        }}
      />
    </>
  );
}
