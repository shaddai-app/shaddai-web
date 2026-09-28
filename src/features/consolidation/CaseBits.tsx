import { ActionIcon, Anchor, Badge, Group, Text, Tooltip, type BadgeProps } from '@mantine/core';
import { IconBrandWhatsapp, IconPhone } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { CaseStatus } from '../../api/consolidation';
import { formatDate } from '../people/format';
import { whatsappHref } from './steps';

const STATUS_COLORS: Record<CaseStatus, string> = { open: 'blue', completed: 'teal', dropped: 'gray' };

export function CaseStatusBadge({ status, ...props }: { status: CaseStatus } & BadgeProps) {
  const { t } = useTranslation('consolidation');
  return (
    <Badge variant="light" color={STATUS_COLORS[status]} {...props}>
      {t(`status.${status}`)}
    </Badge>
  );
}

/** «Vence el 12/10» (rojo si ya venció). */
export function DueText({ dueAt, overdue }: { dueAt: string | null; overdue: boolean }) {
  const { t } = useTranslation('consolidation');
  if (!dueAt) return null;
  return (
    <Text size="xs" c={overdue ? 'red' : 'dimmed'} fw={overdue ? 600 : undefined}>
      {overdue ? t('due.overdue', { date: formatDate(dueAt) }) : t('due.on', { date: formatDate(dueAt) })}
    </Text>
  );
}

/** Llamar y escribir por WhatsApp (con un saludo listo para enviar). */
export function ContactButtons({ phone, firstName }: { phone: string | null; firstName: string }) {
  const { t } = useTranslation('consolidation');
  if (!phone) return null;
  const wa = whatsappHref(phone, t('whatsapp.greeting', { name: firstName }));
  return (
    <Group gap={4} wrap="nowrap">
      <Tooltip label={t('contact.call')}>
        <ActionIcon component="a" href={`tel:${phone}`} variant="light" aria-label={t('contact.call')}>
          <IconPhone size={16} />
        </ActionIcon>
      </Tooltip>
      {wa && (
        <Tooltip label="WhatsApp">
          <ActionIcon
            component="a"
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            variant="light"
            color="green"
            aria-label="WhatsApp"
          >
            <IconBrandWhatsapp size={16} />
          </ActionIcon>
        </Tooltip>
      )}
      <Anchor href={`tel:${phone}`} size="sm" visibleFrom="sm">
        {phone}
      </Anchor>
    </Group>
  );
}
