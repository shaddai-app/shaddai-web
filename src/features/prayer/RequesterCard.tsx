import { Badge, Button, Card, Group, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconBrandWhatsapp, IconCheck, IconMail, IconPhone } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { prayerApi, type PrayerRequest, type PrayerRequester } from '../../api/prayer';
import { errorMessage } from '../../i18n/errors';
import { whatsappHref } from '../consolidation/steps';

/**
 * Quien pidió oración desde el formulario: su contacto (llamar, WhatsApp, mail), si pidió que lo
 * contacten y "Marcar como contactado" (solo con oracion.pastoral).
 */
export function RequesterCard({
  p,
  requester,
  canMark,
}: {
  p: PrayerRequest;
  requester: PrayerRequester;
  canMark: boolean;
}) {
  const { t } = useTranslation('prayer');
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const { phone, email } = requester;
  const wa = whatsappHref(phone, t('requester.greeting', { name: requester.name ?? '' }));

  const toggle = async () => {
    setBusy(true);
    try {
      await (requester.contactedAt ? prayerApi.uncontacted(p.id) : prayerApi.contacted(p.id));
      await queryClient.invalidateQueries({ queryKey: ['prayer'] });
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card withBorder radius="lg">
      <Stack gap="sm">
        <Group justify="space-between" gap="xs">
          <Text fw={600}>{t('requester.title')}</Text>
          <ContactBadge requester={requester} />
        </Group>
        <Text size="sm">
          {requester.name ?? (
            <Text span fs="italic" c="dimmed">
              {t('requester.noName')}
            </Text>
          )}
        </Text>
        {phone || email ? (
          <Group gap="xs">
            {phone && (
              <Button
                component="a"
                href={`tel:${phone}`}
                size="xs"
                variant="light"
                leftSection={<IconPhone size={16} />}
              >
                {phone}
              </Button>
            )}
            {wa && (
              <Button
                component="a"
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                size="xs"
                variant="light"
                color="green"
                leftSection={<IconBrandWhatsapp size={16} />}
              >
                WhatsApp
              </Button>
            )}
            {email && (
              <Button
                component="a"
                href={`mailto:${email}`}
                size="xs"
                variant="light"
                leftSection={<IconMail size={16} />}
                style={{ maxWidth: '100%' }}
              >
                <Text span size="xs" truncate>
                  {email}
                </Text>
              </Button>
            )}
          </Group>
        ) : (
          <Text size="sm" c="dimmed">
            {t('requester.noContact')}
          </Text>
        )}
        <Text size="xs" c="dimmed">
          {t(`requester.wall.${requester.wallShare ?? 'no'}`)}
        </Text>
        {requester.contactedAt && (
          <Text size="xs" c="dimmed">
            {t('requester.contactedBy', {
              name: requester.contactedBy ?? '',
              date: dayjs(requester.contactedAt).format('L'),
            })}
          </Text>
        )}
        {canMark && (phone || email) && (
          <Group>
            <Button
              size="xs"
              variant={requester.contactedAt ? 'subtle' : 'light'}
              color={requester.contactedAt ? 'gray' : 'teal'}
              leftSection={requester.contactedAt ? undefined : <IconCheck size={16} />}
              loading={busy}
              onClick={() => void toggle()}
            >
              {requester.contactedAt ? t('requester.undo') : t('requester.markContacted')}
            </Button>
          </Group>
        )}
      </Stack>
    </Card>
  );
}

/** "Pide contacto" (aviso) o "Contactado" (correcto); nada si no pidió contacto. */
export function ContactBadge({ requester }: { requester: PrayerRequester }) {
  const { t } = useTranslation('prayer');
  if (requester.contactedAt) {
    return (
      <Badge size="sm" variant="light" color="teal">
        {t('badge.contacted')}
      </Badge>
    );
  }
  if (!requester.wantsContact) return null;
  return (
    <Badge size="sm" variant="light" color="yellow">
      {t('badge.wantsContact')}
    </Badge>
  );
}
