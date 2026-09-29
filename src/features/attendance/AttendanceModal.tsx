import {
  ActionIcon,
  Alert,
  Button,
  Group,
  Loader,
  NumberInput,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconMinus, IconPlus, IconTrash } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { attendanceApi, type AttendanceCounts, type OccurrenceAttendance } from '../../api/attendance';
import type { LocalDateTime } from '../../api/calendar';
import { FormError } from '../../components/FormError';
import { ResponsiveModal } from '../../components/ResponsiveModal';
import { useWhenText } from '../calendar/common';

type CountKey = 'adults' | 'children' | 'newcomers' | 'online';
const COUNT_KEYS: CountKey[] = ['adults', 'children', 'newcomers', 'online'];

/** Contador grande con − y +, cómodo para cargar desde el celular al terminar el culto. */
function Counter({
  label,
  hint,
  value,
  onChange,
  autoFocus,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  autoFocus?: boolean;
}) {
  const { t } = useTranslation('calendar');
  const set = (v: number) => onChange(Math.min(100_000, Math.max(0, Math.round(v) || 0)));
  return (
    <Paper withBorder radius="md" p="sm">
      <Text size="sm" fw={600}>
        {label}
      </Text>
      {hint && (
        <Text size="xs" c="dimmed">
          {hint}
        </Text>
      )}
      <Group gap="xs" mt={6} wrap="nowrap">
        <ActionIcon
          variant="default"
          size="xl"
          radius="md"
          onClick={() => set(value - 1)}
          disabled={value <= 0}
          aria-label={t('attendance.less', { label })}
        >
          <IconMinus size={20} />
        </ActionIcon>
        <NumberInput
          value={value}
          onChange={(v) => set(Number(v))}
          min={0}
          max={100_000}
          allowDecimal={false}
          allowNegative={false}
          hideControls
          size="lg"
          inputMode="numeric"
          aria-label={label}
          data-autofocus={autoFocus || undefined}
          onFocus={(e) => e.currentTarget.select()}
          styles={{ input: { textAlign: 'center', fontWeight: 600 } }}
          style={{ flex: 1, minWidth: 0 }}
        />
        <ActionIcon
          variant="default"
          size="xl"
          radius="md"
          onClick={() => set(value + 1)}
          aria-label={t('attendance.more', { label })}
        >
          <IconPlus size={20} />
        </ActionIcon>
      </Group>
    </Paper>
  );
}

function AttendanceForm({
  data,
  canEdit,
  onClose,
  onSaved,
}: {
  data: OccurrenceAttendance;
  canEdit: boolean;
  onClose: () => void;
  onSaved: (deleted: boolean) => void;
}) {
  const { t } = useTranslation(['calendar', 'common']);
  const whenText = useWhenText();
  const a = data.attendance;
  const [counts, setCounts] = useState<Record<CountKey, number>>({
    adults: a?.adults ?? 0,
    children: a?.children ?? 0,
    newcomers: a?.newcomers ?? 0,
    online: a?.online ?? 0,
  });
  const [notes, setNotes] = useState(a?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const inPerson = counts.adults + counts.children;
  const tooManyNew = counts.newcomers > inPerson;
  const editable = canEdit && data.started && !data.cancelled;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const body: AttendanceCounts = { ...counts, notes: notes.trim() || null };
      await attendanceApi.save(data.event.id, data.occurrence, body);
      onSaved(false);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  const remove = () =>
    modals.openConfirmModal({
      title: t('attendance.deleteTitle'),
      children: <Text size="sm">{t('attendance.deleteBody')}</Text>,
      labels: { confirm: t('attendance.delete'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await attendanceApi.remove(data.event.id, data.occurrence);
          onSaved(true);
        } catch (err) {
          setError(err);
        }
      },
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (editable && !tooManyNew) void save();
      }}
    >
      <Stack gap="sm">
        <div>
          <Text fw={600}>{data.event.title}</Text>
          <Text size="sm" c="dimmed">
            {whenText({ startsAt: data.startsAt, endsAt: data.endsAt, allDay: false })}
          </Text>
        </div>
        {data.cancelled && (
          <Alert color="red" variant="light" p="xs">
            {t('attendance.cancelled')}
          </Alert>
        )}
        {!data.started && (
          <Alert color="gray" variant="light" p="xs">
            {t('attendance.notStarted')}
          </Alert>
        )}
        <FormError error={error} />
        {editable ? (
          <>
            <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
              {COUNT_KEYS.map((k, i) => (
                <Counter
                  key={k}
                  label={t(`attendance.fields.${k}`)}
                  hint={k === 'newcomers' || k === 'online' ? t(`attendance.hints.${k}`) : undefined}
                  value={counts[k]}
                  onChange={(v) => setCounts((c) => ({ ...c, [k]: v }))}
                  autoFocus={i === 0}
                />
              ))}
            </SimpleGrid>
            <Group justify="space-between" px={4}>
              <Text size="sm" c="dimmed">
                {t('attendance.fields.inPerson')}
              </Text>
              <Text fw={700} size="lg">
                {inPerson}
              </Text>
            </Group>
            {tooManyNew && (
              <Text size="sm" c="red">
                {t('attendance.tooManyNew')}
              </Text>
            )}
            <Textarea
              label={t('attendance.notes')}
              placeholder={t('attendance.notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
              maxLength={500}
              autosize
              minRows={1}
            />
            <Group justify="space-between" mt="xs">
              {a ? (
                <Button variant="subtle" color="red" leftSection={<IconTrash size={16} />} onClick={remove}>
                  {t('attendance.delete')}
                </Button>
              ) : (
                <span />
              )}
              <Group gap="xs">
                <Button variant="default" onClick={onClose}>
                  {t('common:actions.cancel')}
                </Button>
                <Button type="submit" loading={busy} disabled={tooManyNew}>
                  {t('common:actions.save')}
                </Button>
              </Group>
            </Group>
          </>
        ) : a ? (
          <SimpleGrid cols={2} spacing="sm">
            {[...COUNT_KEYS, 'inPerson' as const].map((k) => (
              <div key={k}>
                <Text size="xs" c="dimmed">
                  {t(`attendance.fields.${k}`)}
                </Text>
                <Text fw={600}>{k === 'inPerson' ? a.inPerson : a[k]}</Text>
              </div>
            ))}
            {a.notes && (
              <Text size="sm" style={{ gridColumn: '1 / -1', whiteSpace: 'pre-wrap' }}>
                {a.notes}
              </Text>
            )}
          </SimpleGrid>
        ) : (
          <Text size="sm" c="dimmed">
            {t('attendance.none')}
          </Text>
        )}
      </Stack>
    </form>
  );
}

/** Carga rápida (o consulta) de la asistencia de una fecha de un evento. */
export function AttendanceModal({
  target,
  canEdit,
  onClose,
  onSaved,
}: {
  target: { eventId: number; occurrence: LocalDateTime } | null;
  canEdit: boolean;
  onClose: () => void;
  onSaved: (deleted: boolean) => void;
}) {
  const { t } = useTranslation('calendar');
  const query = useQuery({
    queryKey: ['attendance', 'occurrence', target?.eventId, target?.occurrence],
    queryFn: () => attendanceApi.get(target!.eventId, target!.occurrence),
    enabled: target !== null,
    gcTime: 0,
  });
  return (
    <ResponsiveModal opened={target !== null} onClose={onClose} title={t('attendance.modalTitle')} size="md">
      {query.isPending ? (
        <Loader />
      ) : query.isError ? (
        <FormError error={query.error} />
      ) : (
        <AttendanceForm
          key={`${query.data.event.id}-${query.data.occurrence}`}
          data={query.data}
          canEdit={canEdit}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </ResponsiveModal>
  );
}
