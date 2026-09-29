import { Button, Group, SegmentedControl, Select, SimpleGrid, Stack, TextInput } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calendarApi } from '../../api/calendar';
import { ApiError } from '../../api/http';
import { setlistsApi, type Setlist } from '../../api/worship';
import { FormError } from '../../components/FormError';
import { ResponsiveModal } from '../../components/ResponsiveModal';
import { addDays } from '../calendar/dates';
import { todayIso } from '../people/format';

const UPCOMING_DAYS = 60;

function NewSetlistForm({
  onClose,
  onCreated,
  onExisting,
}: {
  onClose: () => void;
  onCreated: (s: Setlist) => void;
  onExisting: (id: number) => void;
}) {
  const { t } = useTranslation(['worship', 'common']);
  const [mode, setMode] = useState<'event' | 'free'>('event');
  const [occurrence, setOccurrence] = useState<string | null>(null);
  const [date, setDate] = useState(todayIso());
  const [time, setTime] = useState('19:00');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const today = todayIso();
  const upcoming = useQuery({
    queryKey: ['calendar', 'setlist-options', today],
    queryFn: () => calendarApi.range(today, addDays(today, UPCOMING_DAYS), ['service', 'special', 'meeting']),
  });
  const options = (upcoming.data?.items ?? [])
    .filter((o) => o.eventId !== null && !o.cancelled && o.endsAt >= dayjs().format('YYYY-MM-DDTHH:mm'))
    .map((o) => ({
      value: `${o.eventId}|${o.originalStart}`,
      label: `${dayjs(o.startsAt).format('ddd L · LT')} — ${o.title}`,
    }));
  const valid = mode === 'event' ? Boolean(occurrence) : Boolean(date && time && title.trim());

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        setBusy(true);
        setError(null);
        try {
          const [eventId, original] = mode === 'event' ? occurrence!.split('|') : [null, `${date}T${time}`];
          onCreated(
            await setlistsApi.create({
              eventId: eventId ? Number(eventId) : null,
              occurrence: original!,
              title: mode === 'free' ? title.trim() : null,
            }),
          );
        } catch (err) {
          // Ya hay una lista para esa fecha: se abre esa.
          if (err instanceof ApiError && err.code === 'SETLIST_EXISTS') {
            onExisting((err.details as { id: number }).id);
            return;
          }
          setError(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Stack>
        <FormError error={error} />
        <SegmentedControl
          value={mode}
          onChange={(v) => setMode(v as 'event' | 'free')}
          data={[
            { value: 'event', label: t('setlists.new.forEvent') },
            { value: 'free', label: t('setlists.new.free') },
          ]}
          fullWidth
        />
        {mode === 'event' ? (
          <Select
            label={t('setlists.new.date')}
            placeholder={upcoming.isPending ? t('setlists.new.loading') : t('setlists.new.pick')}
            data={options}
            value={occurrence}
            onChange={setOccurrence}
            searchable
            nothingFoundMessage={t('setlists.new.noDates')}
            comboboxProps={{ withinPortal: true }}
            data-autofocus
          />
        ) : (
          <>
            <TextInput
              label={t('setlists.new.title')}
              placeholder={t('setlists.new.titlePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
              maxLength={150}
              required
              data-autofocus
            />
            <SimpleGrid cols={2} spacing="sm">
              <TextInput
                type="date"
                label={t('setlists.new.day')}
                value={date}
                onChange={(e) => setDate(e.currentTarget.value)}
                required
              />
              <TextInput
                type="time"
                label={t('setlists.new.time')}
                value={time}
                onChange={(e) => setTime(e.currentTarget.value)}
                required
              />
            </SimpleGrid>
          </>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={busy} disabled={!valid}>
            {t('setlists.new.create')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

/** Nueva lista: para una fecha de un culto/evento o una fecha suelta (ej. un ensayo). */
export function NewSetlistModal({
  opened,
  onClose,
  onCreated,
  onExisting,
}: {
  opened: boolean;
  onClose: () => void;
  onCreated: (s: Setlist) => void;
  onExisting: (id: number) => void;
}) {
  const { t } = useTranslation('worship');
  return (
    <ResponsiveModal opened={opened} onClose={onClose} title={t('setlists.new.heading')} size="md">
      {opened && <NewSetlistForm onClose={onClose} onCreated={onCreated} onExisting={onExisting} />}
    </ResponsiveModal>
  );
}
