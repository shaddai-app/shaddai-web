import { Badge, Box, Group, Text } from '@mantine/core';
import dayjs from 'dayjs';
import { IconMapPin } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Occurrence } from '../../api/calendar';
import { UnstyledLink } from '../../components/links';
import { TYPE_COLORS } from './common';
import { dayOf, timeOf } from './dates';

/** Enlace de una fecha: la ficha del evento (en esa fecha) o la célula. */
export function OccurrenceLink({
  o,
  children,
  style,
}: {
  o: Occurrence;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  return o.source === 'cell' ? (
    <UnstyledLink to="/celulas/$id" params={{ id: String(o.cellId) }} style={style}>
      {children}
    </UnstyledLink>
  ) : (
    <UnstyledLink
      to="/eventos/$id"
      params={{ id: String(o.eventId) }}
      search={{ fecha: o.originalStart }}
      style={style}
    >
      {children}
    </UnstyledLink>
  );
}

const dot = (color: string) => (
  <Box
    w={8}
    h={8}
    style={{ borderRadius: 99, background: `var(--mantine-color-${color}-6)`, flexShrink: 0 }}
  />
);

/** Versión corta para la grilla del mes: punto de color, hora y título. */
/** showTime: en pantallas angostas no entra la hora; se prioriza el título. */
export function OccurrenceChip({ o, showTime = true }: { o: Occurrence; showTime?: boolean }) {
  return (
    <OccurrenceLink o={o} style={{ display: 'block', borderRadius: 4, padding: '1px 4px' }}>
      <Group gap={4} wrap="nowrap">
        {dot(TYPE_COLORS[o.type])}
        <Text
          size="xs"
          truncate
          td={o.cancelled ? 'line-through' : undefined}
          c={o.cancelled ? 'dimmed' : undefined}
        >
          {showTime && !o.allDay && <b>{timeOf(o.startsAt)} </b>}
          {o.title}
        </Text>
      </Group>
    </OccurrenceLink>
  );
}

/** Fila de agenda y semana: horario, título, lugar y estado. */
export function OccurrenceRow({
  o,
  compact = false,
  showDate = false,
}: {
  o: Occurrence;
  compact?: boolean;
  /** En listas de varios días (próximas fechas) va la fecha antes del horario. */
  showDate?: boolean;
}) {
  const { t } = useTranslation('calendar');
  return (
    <OccurrenceLink
      o={o}
      style={{
        display: 'block',
        padding: compact ? '4px 6px' : '8px 12px',
        borderRadius: 8,
        borderLeft: `3px solid var(--mantine-color-${TYPE_COLORS[o.type]}-6)`,
        background: 'var(--mantine-color-default-hover)',
      }}
    >
      <Group justify="space-between" wrap="nowrap" gap="xs" align="flex-start">
        <div style={{ minWidth: 0 }}>
          <Text size="xs" c="dimmed">
            {showDate && `${dayjs(dayOf(o.startsAt)).format('ddd L')} · `}
            {o.allDay ? t('allDay') : `${timeOf(o.startsAt)} – ${timeOf(o.endsAt)}`}
          </Text>
          <Text
            size="sm"
            fw={500}
            truncate
            td={o.cancelled ? 'line-through' : undefined}
            c={o.cancelled ? 'dimmed' : undefined}
          >
            {o.title}
          </Text>
          {!compact && o.location && (
            <Group gap={4} wrap="nowrap">
              <IconMapPin size={12} color="var(--mantine-color-dimmed)" />
              <Text size="xs" c="dimmed" truncate>
                {o.location}
              </Text>
            </Group>
          )}
          {!compact && o.note && (
            <Text size="xs" c={o.cancelled ? 'red' : 'blue'} truncate>
              {o.note}
            </Text>
          )}
        </div>
        {!compact && (o.cancelled || o.moved) && (
          <Badge size="xs" variant="light" color={o.cancelled ? 'red' : 'blue'} style={{ flexShrink: 0 }}>
            {o.cancelled ? t('cancelled') : t('moved')}
          </Badge>
        )}
      </Group>
    </OccurrenceLink>
  );
}
