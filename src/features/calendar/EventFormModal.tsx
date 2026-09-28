import {
  Alert,
  Button,
  Chip,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  calendarApi,
  EVENT_TYPES,
  type CalendarEvent,
  type EventInput,
  type EventType,
  type Recurrence,
} from '../../api/calendar';
import { FormError } from '../../components/FormError';
import { ResponsiveModal } from '../../components/ResponsiveModal';
import { useSeparators } from '../finance/money-input';
import { nthOfMonth, weekdayName } from './common';
import { addDays, dayOf, timeOf, weekdayOf } from './dates';

/** create: evento nuevo · series: toda la serie · following: esta fecha y las siguientes. */
export type EventFormMode = 'create' | 'series' | 'following';

type Repeat = 'none' | Recurrence['freq'];
const orNull = (v: string) => (v.trim() === '' ? null : v.trim());

function EventForm({
  mode,
  event,
  occurrence,
  defaultDate,
  onClose,
  onSaved,
}: {
  mode: EventFormMode;
  event: CalendarEvent | null;
  occurrence: { startsAt: string; endsAt: string } | null;
  defaultDate: string;
  onClose: () => void;
  onSaved: (e: CalendarEvent) => void;
}) {
  const { t } = useTranslation(['calendar', 'common']);
  const separators = useSeparators();
  // En "desde esta fecha" se arranca por la fecha elegida (con su horario).
  const initial = mode === 'following' && occurrence ? occurrence : event;
  const [type, setType] = useState<EventType>(event?.type ?? 'special');
  const [title, setTitle] = useState(event?.title ?? '');
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [startDate, setStartDate] = useState(initial ? dayOf(initial.startsAt) : defaultDate);
  const [startTime, setStartTime] = useState(initial && !event?.allDay ? timeOf(initial.startsAt) : '19:00');
  const [endDate, setEndDate] = useState(initial ? dayOf(initial.endsAt) : defaultDate);
  const [endTime, setEndTime] = useState(initial && !event?.allDay ? timeOf(initial.endsAt) : '21:00');
  const [repeat, setRepeat] = useState<Repeat>(event?.recurrence?.freq ?? 'none');
  const [interval, setInterval] = useState<number | ''>(event?.recurrence?.interval ?? 1);
  const [weekdays, setWeekdays] = useState<string[]>(
    (event?.recurrence?.weekdays ?? [weekdayOf(startDate)]).map(String),
  );
  const [monthlyBy, setMonthlyBy] = useState<'day' | 'weekday'>(event?.recurrence?.monthlyBy ?? 'day');
  const [until, setUntil] = useState(event?.recurrence?.until ?? '');
  const [location, setLocation] = useState(event?.location ?? '');
  const [registration, setRegistration] = useState(event?.registrationEnabled ?? false);
  const [capacity, setCapacity] = useState<number | ''>(event?.capacity ?? '');
  const [waitlist, setWaitlist] = useState(event?.waitlistEnabled ?? true);
  const [price, setPrice] = useState<number | ''>(event?.price ?? '');
  const [isPublic, setIsPublic] = useState(event?.isPublic ?? false);
  const [description, setDescription] = useState(event?.description ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const startsAt = `${startDate}T${allDay ? '00:00' : startTime}`;
  const endsAt = `${endDate}T${allDay ? '23:59' : endTime}`;
  const rangeError = Boolean(startDate && endDate && endsAt < startsAt);
  const valid = Boolean(
    title.trim() && startDate && endDate && (allDay || (startTime && endTime)) && !rangeError,
  );
  const start = dayjs(startDate);
  const unit = { daily: 'day', weekly: 'week', monthly: 'month' } as const;

  const changeStartDate = (value: string) => {
    if (!value) return;
    // El fin se corre junto con el inicio (misma duración en días).
    const span = dayjs(endDate).diff(dayjs(startDate), 'day');
    setStartDate(value);
    setEndDate(addDays(value, Math.max(span, 0)));
    if (repeat === 'weekly' && weekdays.length === 1) setWeekdays([String(weekdayOf(value))]);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const recurrence: Recurrence | null =
        repeat === 'none'
          ? null
          : {
              freq: repeat,
              interval: Number(interval) || 1,
              ...(repeat === 'weekly' ? { weekdays: weekdays.map(Number) } : {}),
              ...(repeat === 'monthly' ? { monthlyBy } : {}),
              until: until || null,
            };
      const body: EventInput = {
        type,
        title: title.trim(),
        description: orNull(description),
        location: orNull(location),
        startsAt,
        endsAt,
        allDay,
        recurrence,
        registrationEnabled: registration,
        capacity: registration && capacity !== '' ? Number(capacity) : null,
        waitlistEnabled: registration && capacity !== '' && waitlist,
        price: registration && price !== '' ? Number(price) : null,
        isPublic: registration && isPublic,
      };
      const saved =
        mode === 'create' || !event
          ? await calendarApi.create(body)
          : mode === 'series'
            ? await calendarApi.update(event.id, body)
            : await calendarApi.split(event.id, occurrence!.startsAt, body);
      onSaved(saved);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) void submit();
      }}
    >
      <Stack>
        <FormError error={error} />
        {mode === 'following' && (
          <Alert color="blue" variant="light" p="xs">
            {t('form.followingHint', { date: dayjs(dayOf(occurrence!.startsAt)).format('L') })}
          </Alert>
        )}
        {mode === 'series' && event?.exceptions.length ? (
          <Alert color="yellow" variant="light" p="xs">
            {t('form.seriesHint')}
          </Alert>
        ) : null}
        <SegmentedControl
          fullWidth
          value={type}
          onChange={(v) => setType(v as EventType)}
          data={EVENT_TYPES.map((x) => ({ value: x, label: t(`types.${x}`) }))}
        />
        <TextInput
          label={t('form.title')}
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          maxLength={150}
          required
          data-autofocus
        />
        <Switch label={t('allDay')} checked={allDay} onChange={(e) => setAllDay(e.currentTarget.checked)} />
        <SimpleGrid cols={2} spacing="sm">
          <TextInput
            type="date"
            label={t('form.start')}
            value={startDate}
            onChange={(e) => changeStartDate(e.currentTarget.value)}
            required
          />
          {!allDay ? (
            <TextInput
              type="time"
              label={t('form.startTime')}
              value={startTime}
              onChange={(e) => setStartTime(e.currentTarget.value)}
              required
            />
          ) : (
            <div />
          )}
          <TextInput
            type="date"
            label={t('form.end')}
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.currentTarget.value)}
            required
          />
          {!allDay && (
            <TextInput
              type="time"
              label={t('form.endTime')}
              value={endTime}
              onChange={(e) => setEndTime(e.currentTarget.value)}
              error={rangeError ? t('form.rangeError') : undefined}
              required
            />
          )}
        </SimpleGrid>

        <Select
          label={t('recurrence.label')}
          data={(['none', 'daily', 'weekly', 'monthly'] as const).map((r) => ({
            value: r,
            label: t(`recurrence.${r}`),
          }))}
          value={repeat}
          onChange={(v) => {
            setRepeat((v as Repeat) ?? 'none');
            if (v === 'weekly' && !weekdays.length) setWeekdays([String(weekdayOf(startDate))]);
          }}
          allowDeselect={false}
        />
        {repeat !== 'none' && (
          <Stack gap="sm" pl="sm" style={{ borderLeft: '2px solid var(--mantine-color-default-border)' }}>
            <Group gap="xs" align="flex-end">
              <NumberInput
                label={t('recurrence.every')}
                value={interval}
                onChange={(v) => setInterval(v === '' ? '' : Number(v))}
                min={1}
                max={12}
                w={90}
                allowDecimal={false}
              />
              <Text size="sm" pb={8}>
                {t(`recurrence.units.${unit[repeat]}`, { count: Number(interval) || 1 })}
              </Text>
            </Group>
            {repeat === 'weekly' && (
              <Chip.Group multiple value={weekdays} onChange={(v) => v.length && setWeekdays(v)}>
                <Group gap={6}>
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                    <Chip key={d} value={String(d)} size="sm">
                      {weekdayName(d, 'dd')}
                    </Chip>
                  ))}
                </Group>
              </Chip.Group>
            )}
            {repeat === 'monthly' && (
              <SegmentedControl
                value={monthlyBy}
                onChange={(v) => setMonthlyBy(v as 'day' | 'weekday')}
                data={[
                  { value: 'day', label: t('recurrence.monthlyDay', { day: start.date() }) },
                  {
                    value: 'weekday',
                    label: t('recurrence.monthlyWeekday', {
                      nth: t(`recurrence.nth.${nthOfMonth(start.date())}` as 'recurrence.nth.1'),
                      weekday: weekdayName(start.day()),
                    }),
                  },
                ]}
              />
            )}
            <TextInput
              type="date"
              label={t('recurrence.until')}
              description={t('recurrence.untilHint')}
              value={until}
              min={startDate}
              onChange={(e) => setUntil(e.currentTarget.value)}
              w={{ base: '100%', xs: 200 }}
            />
          </Stack>
        )}

        <Switch
          label={t('form.registration')}
          description={t('form.registrationHint')}
          checked={registration}
          onChange={(e) => setRegistration(e.currentTarget.checked)}
        />
        {registration && (
          <Stack gap="sm" pl="sm" style={{ borderLeft: '2px solid var(--mantine-color-default-border)' }}>
            <SimpleGrid cols={2} spacing="sm">
              <NumberInput
                label={t('form.capacity')}
                description={t('form.capacityHint')}
                value={capacity}
                onChange={(v) => setCapacity(v === '' ? '' : Number(v))}
                min={1}
                allowDecimal={false}
                allowNegative={false}
              />
              <NumberInput
                label={t('form.price')}
                description={t('form.priceHint')}
                value={price}
                onChange={(v) => setPrice(v === '' ? '' : Number(v))}
                min={0}
                decimalScale={2}
                allowNegative={false}
                {...separators}
              />
            </SimpleGrid>
            {capacity !== '' && (
              <Switch
                label={t('form.waitlist')}
                checked={waitlist}
                onChange={(e) => setWaitlist(e.currentTarget.checked)}
              />
            )}
            <Switch
              label={t('form.public')}
              description={t('form.publicHint')}
              checked={isPublic}
              onChange={(e) => setIsPublic(e.currentTarget.checked)}
            />
          </Stack>
        )}
        <TextInput
          label={t('form.location')}
          value={location}
          onChange={(e) => setLocation(e.currentTarget.value)}
          maxLength={250}
        />
        <Textarea
          label={t('form.description')}
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          maxLength={2000}
          autosize
          minRows={2}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={busy} disabled={!valid}>
            {mode === 'create' ? t('form.create') : t('common:actions.save')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function EventFormModal({
  opened,
  mode,
  event = null,
  occurrence = null,
  defaultDate,
  onClose,
  onSaved,
}: {
  opened: boolean;
  mode: EventFormMode;
  event?: CalendarEvent | null;
  occurrence?: { startsAt: string; endsAt: string } | null;
  defaultDate: string;
  onClose: () => void;
  onSaved: (e: CalendarEvent) => void;
}) {
  const { t } = useTranslation('calendar');
  return (
    <ResponsiveModal opened={opened} onClose={onClose} title={t(`form.titles.${mode}`)} size="lg">
      {opened && (
        <EventForm
          mode={mode}
          event={event}
          occurrence={occurrence}
          defaultDate={defaultDate}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </ResponsiveModal>
  );
}
