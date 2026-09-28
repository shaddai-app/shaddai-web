import { Button, Group, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calendarApi, type CalendarEvent, type Occurrence } from '../../api/calendar';
import { FormError } from '../../components/FormError';
import { ResponsiveModal } from '../../components/ResponsiveModal';
import { dayOf, timeOf } from './dates';

export type OccurrenceAction = 'cancel' | 'move';

function OccurrenceForm({
  action,
  eventId,
  occurrence,
  onClose,
  onSaved,
}: {
  action: OccurrenceAction;
  eventId: number;
  occurrence: Occurrence;
  onClose: () => void;
  onSaved: (e: CalendarEvent) => void;
}) {
  const { t } = useTranslation(['calendar', 'common']);
  const [date, setDate] = useState(dayOf(occurrence.startsAt));
  const [start, setStart] = useState(timeOf(occurrence.startsAt));
  const [end, setEnd] = useState(timeOf(occurrence.endsAt));
  const [note, setNote] = useState(occurrence.note ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const multiDay = dayOf(occurrence.startsAt) !== dayOf(occurrence.endsAt);
  const valid = action === 'cancel' || Boolean(date && start && (multiDay || (end && end > start)));

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        setBusy(true);
        setError(null);
        try {
          onSaved(
            await calendarApi.setException(eventId, {
              originalStart: occurrence.originalStart,
              cancelled: action === 'cancel',
              ...(action === 'move'
                ? {
                    newStartsAt: `${date}T${occurrence.allDay ? '00:00' : start}`,
                    // Si dura varios días se mantiene la duración (la calcula la API).
                    newEndsAt: multiDay ? null : `${date}T${occurrence.allDay ? '23:59' : end}`,
                  }
                : {}),
              note: note.trim() || null,
            }),
          );
        } catch (err) {
          setError(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Stack>
        <FormError error={error} />
        <Text size="sm">
          {t(`occurrence.${action}Body`, { date: dayjs(dayOf(occurrence.originalStart)).format('dddd L') })}
        </Text>
        {action === 'move' && (
          <SimpleGrid cols={{ base: 1, xs: occurrence.allDay ? 1 : 3 }} spacing="sm">
            <TextInput
              type="date"
              label={t('form.start')}
              value={date}
              onChange={(e) => setDate(e.currentTarget.value)}
              required
              data-autofocus
            />
            {!occurrence.allDay && (
              <TextInput
                type="time"
                label={t('form.startTime')}
                value={start}
                onChange={(e) => setStart(e.currentTarget.value)}
                required
              />
            )}
            {!occurrence.allDay && !multiDay && (
              <TextInput
                type="time"
                label={t('form.endTime')}
                value={end}
                onChange={(e) => setEnd(e.currentTarget.value)}
                required
              />
            )}
          </SimpleGrid>
        )}
        <TextInput
          label={t('occurrence.note')}
          placeholder={t(action === 'cancel' ? 'occurrence.cancelPlaceholder' : 'occurrence.movePlaceholder')}
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
          maxLength={200}
          data-autofocus={action === 'cancel' ? true : undefined}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            type="submit"
            color={action === 'cancel' ? 'red' : undefined}
            loading={busy}
            disabled={!valid}
          >
            {t(`occurrence.${action}`)}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

/** Cancela (feriado) o cambia el horario de una sola fecha de una serie. */
export function OccurrenceModal({
  action,
  eventId,
  occurrence,
  onClose,
  onSaved,
}: {
  action: OccurrenceAction | null;
  eventId: number;
  occurrence: Occurrence | null;
  onClose: () => void;
  onSaved: (e: CalendarEvent) => void;
}) {
  const { t } = useTranslation('calendar');
  return (
    <ResponsiveModal
      opened={action !== null && occurrence !== null}
      onClose={onClose}
      title={action ? t(`occurrence.${action}Title`) : ''}
      size="md"
    >
      {action && occurrence && (
        <OccurrenceForm
          action={action}
          eventId={eventId}
          occurrence={occurrence}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </ResponsiveModal>
  );
}
