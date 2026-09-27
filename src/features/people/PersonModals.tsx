import { Alert, Button, Group, MultiSelect, Select, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { peopleApi, type PersonDetail, type PersonListItem } from '../../api/people';
import { FormError } from '../../components/FormError';
import { ResponsiveModal } from '../../components/ResponsiveModal';
import { tagsQuery, useCatalogOptions } from './catalog';
import { fullName, todayIso } from './format';
import { PersonPicker } from './PersonPicker';

type Base = { person: PersonDetail; onClose: () => void; onDone: (p: PersonDetail) => void };

/** Botones + manejo de error comunes a los modales chicos de la ficha. */
function useAction(onDone: (p: PersonDetail) => void) {
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<PersonDetail>) => {
    setError(null);
    setBusy(true);
    try {
      onDone(await fn());
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  return { error, busy, run };
}

function Actions({
  onClose,
  busy,
  disabled,
  label,
  color,
}: {
  onClose: () => void;
  busy: boolean;
  disabled?: boolean;
  label?: ReactNode;
  color?: string;
}) {
  const { t } = useTranslation('common');
  return (
    <Group justify="flex-end">
      <Button variant="default" onClick={onClose}>
        {t('actions.cancel')}
      </Button>
      <Button type="submit" loading={busy} disabled={disabled} color={color}>
        {label ?? t('actions.save')}
      </Button>
    </Group>
  );
}

// ── Estado ──────────────────────────────────────────────────────────────────
function StatusForm({ person, onClose, onDone }: Base) {
  const { t } = useTranslation('people');
  const options = useCatalogOptions('person_status');
  const [statusId, setStatusId] = useState<string | null>(String(person.status.id));
  const [note, setNote] = useState('');
  const { error, busy, run } = useAction(onDone);
  const unchanged = statusId === String(person.status.id);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void run(() =>
          peopleApi.changeStatus(person.id, { statusId: Number(statusId), note: note.trim() || null }),
        );
      }}
    >
      <Stack>
        <FormError error={error} />
        <Select
          label={t('status.new')}
          data={options}
          value={statusId}
          onChange={setStatusId}
          allowDeselect={false}
          comboboxProps={{ withinPortal: true }}
          data-autofocus
        />
        <Textarea
          label={t('status.note')}
          placeholder={t('status.notePlaceholder')}
          maxLength={300}
          autosize
          minRows={2}
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
        />
        <Actions onClose={onClose} busy={busy} disabled={unchanged || !statusId} />
      </Stack>
    </form>
  );
}

// ── Etiquetas ───────────────────────────────────────────────────────────────
function TagsForm({ person, onClose, onDone }: Base) {
  const { t } = useTranslation('people');
  const tags = useQuery(tagsQuery());
  const [value, setValue] = useState(person.tags.map((tg) => String(tg.id)));
  const { error, busy, run } = useAction(onDone);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void run(() => peopleApi.setTags(person.id, value.map(Number)));
      }}
    >
      <Stack>
        <FormError error={error} />
        <MultiSelect
          label={t('form.tags')}
          data={(tags.data ?? []).map((tg) => ({ value: String(tg.id), label: tg.name }))}
          value={value}
          onChange={setValue}
          searchable
          clearable
          comboboxProps={{ withinPortal: true }}
          data-autofocus
        />
        <Actions onClose={onClose} busy={busy} />
      </Stack>
    </form>
  );
}

// ── Hito ────────────────────────────────────────────────────────────────────
function MilestoneForm({ person, onClose, onDone }: Base) {
  const { t } = useTranslation('people');
  const options = useCatalogOptions('milestone');
  const [typeId, setTypeId] = useState<string | null>(null);
  const [date, setDate] = useState(todayIso());
  const [notes, setNotes] = useState('');
  const { error, busy, run } = useAction(onDone);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void run(() =>
          peopleApi.addMilestone(person.id, {
            milestoneTypeId: Number(typeId),
            date,
            notes: notes.trim() || null,
          }),
        );
      }}
    >
      <Stack>
        <FormError error={error} />
        <Select
          label={t('milestones.type')}
          data={options}
          value={typeId}
          onChange={setTypeId}
          required
          comboboxProps={{ withinPortal: true }}
          data-autofocus
        />
        <TextInput
          label={t('milestones.date')}
          type="date"
          max={todayIso()}
          required
          value={date}
          onChange={(e) => setDate(e.currentTarget.value)}
        />
        <Textarea
          label={t('milestones.notes')}
          maxLength={500}
          autosize
          minRows={2}
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
        />
        <Actions onClose={onClose} busy={busy} disabled={!typeId || !date} />
      </Stack>
    </form>
  );
}

// ── Cargo ───────────────────────────────────────────────────────────────────
function PositionForm({ person, onClose, onDone }: Base) {
  const { t } = useTranslation('people');
  const options = useCatalogOptions('position');
  const [positionId, setPositionId] = useState<string | null>(null);
  const [since, setSince] = useState('');
  const { error, busy, run } = useAction(onDone);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void run(() =>
          peopleApi.addPosition(person.id, { positionId: Number(positionId), since: since || null }),
        );
      }}
    >
      <Stack>
        <FormError error={error} />
        <Select
          label={t('positions.position')}
          data={options}
          value={positionId}
          onChange={setPositionId}
          required
          comboboxProps={{ withinPortal: true }}
          data-autofocus
        />
        <TextInput
          label={t('positions.since')}
          type="date"
          max={todayIso()}
          value={since}
          onChange={(e) => setSince(e.currentTarget.value)}
        />
        <Actions onClose={onClose} busy={busy} disabled={!positionId} />
      </Stack>
    </form>
  );
}

// ── Fusión ──────────────────────────────────────────────────────────────────
function MergeForm({ person, onClose, onDone }: Base) {
  const { t } = useTranslation('people');
  const [target, setTarget] = useState<PersonListItem | null>(null);
  const { error, busy, run } = useAction(onDone);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (target) void run(() => peopleApi.merge(person.id, target.id));
      }}
    >
      <Stack>
        <Alert color="orange" variant="light">
          <Text size="sm">{t('merge.body')}</Text>
        </Alert>
        <FormError error={error} />
        <PersonPicker
          label={t('merge.target')}
          value={target}
          onChange={setTarget}
          exclude={[person.id]}
          data-autofocus
        />
        {target && (
          <Text size="sm">
            {fullName(person)} → <b>{fullName(target)}</b>
          </Text>
        )}
        <Actions onClose={onClose} busy={busy} disabled={!target} label={t('merge.confirm')} color="orange" />
      </Stack>
    </form>
  );
}

export type PersonModal = 'status' | 'tags' | 'milestone' | 'position' | 'merge' | null;

const FORMS = {
  status: StatusForm,
  tags: TagsForm,
  milestone: MilestoneForm,
  position: PositionForm,
  merge: MergeForm,
} as const;

/** Un solo modal para las acciones rápidas de la ficha. */
export function PersonActionModal({ modal, ...props }: Base & { modal: PersonModal }) {
  const { t } = useTranslation('people');
  const titles = {
    status: t('status.title'),
    tags: t('tagsModal.title'),
    milestone: t('milestones.add'),
    position: t('positions.add'),
    merge: t('merge.title'),
  };
  const Form = modal ? FORMS[modal] : null;
  return (
    <ResponsiveModal
      opened={modal !== null}
      onClose={props.onClose}
      title={modal ? titles[modal] : ''}
      size="md"
    >
      {Form && <Form key={modal} {...props} />}
    </ResponsiveModal>
  );
}
