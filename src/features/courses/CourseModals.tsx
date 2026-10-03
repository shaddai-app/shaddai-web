import {
  ActionIcon,
  Badge,
  Button,
  CloseButton,
  Group,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { coursesApi, type Course, type CourseLevel } from '../../api/courses';
import type { PersonListItem } from '../../api/people';
import { FormError } from '../../components/FormError';
import { ResponsiveModal } from '../../components/ResponsiveModal';
import { useCatalogOptions } from '../people/catalog';
import { fullName, todayIso } from '../people/format';
import { PersonPicker, type PersonOption } from '../people/PersonPicker';

/** Guarda y maneja el estado de "enviando" y el error de un formulario. */
function useSubmit<T>(onSaved: (value: T) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const submit = async (action: () => Promise<T>) => {
    setBusy(true);
    setError(null);
    try {
      onSaved(await action());
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, submit };
}

// ───────────── Curso ─────────────

function CourseForm({
  course,
  onClose,
  onSaved,
}: {
  course: Course | null;
  onClose: () => void;
  onSaved: (c: Course) => void;
}) {
  const { t } = useTranslation(['courses', 'common']);
  const milestones = useCatalogOptions('milestone');
  const [name, setName] = useState(course?.name ?? '');
  const [description, setDescription] = useState(course?.description ?? '');
  const [milestoneId, setMilestoneId] = useState<string | null>(
    course?.milestoneType ? String(course.milestoneType.id) : null,
  );
  const [isActive, setIsActive] = useState(course?.isActive ?? true);
  const [levels, setLevels] = useState<string[]>([t('form.defaultLevel', { n: 1 })]);
  const { busy, error, submit } = useSubmit(onSaved);
  const valid = name.trim() !== '' && (course !== null || levels.every((l) => l.trim() !== ''));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        const body = {
          name: name.trim(),
          description: description.trim() || null,
          milestoneTypeId: milestoneId ? Number(milestoneId) : null,
        };
        void submit(() =>
          course
            ? coursesApi.update(course.id, { ...body, isActive })
            : coursesApi.create({ ...body, levels: levels.map((l) => ({ name: l.trim() })) }),
        );
      }}
    >
      <Stack>
        <FormError error={error} />
        <TextInput
          label={t('form.name')}
          placeholder={t('form.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          maxLength={100}
          required
          data-autofocus
        />
        <Textarea
          label={t('form.description')}
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          autosize
          minRows={2}
          maxLength={500}
        />
        <Select
          label={t('form.milestone')}
          description={t('form.milestoneHint')}
          placeholder={t('form.noMilestone')}
          data={milestones}
          value={milestoneId}
          onChange={setMilestoneId}
          clearable
        />
        {course ? (
          <Switch
            label={t('form.active')}
            description={t('form.activeHint')}
            checked={isActive}
            onChange={(e) => setIsActive(e.currentTarget.checked)}
          />
        ) : (
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              {t('form.levels')}
            </Text>
            {levels.map((level, i) => (
              <Group key={i} gap="xs" wrap="nowrap">
                <TextInput
                  style={{ flex: 1 }}
                  aria-label={t('form.levelName', { n: i + 1 })}
                  value={level}
                  onChange={(e) => {
                    const value = e.currentTarget.value;
                    setLevels((ls) => ls.map((l, j) => (j === i ? value : l)));
                  }}
                  maxLength={100}
                  required
                />
                {levels.length > 1 && (
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label={t('form.removeLevel')}
                    onClick={() => setLevels((ls) => ls.filter((_, j) => j !== i))}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                )}
              </Group>
            ))}
            {levels.length < 20 && (
              <Button
                variant="subtle"
                size="xs"
                leftSection={<IconPlus size={14} />}
                style={{ alignSelf: 'flex-start' }}
                onClick={() => setLevels((ls) => [...ls, t('form.defaultLevel', { n: ls.length + 1 })])}
              >
                {t('form.addLevel')}
              </Button>
            )}
          </Stack>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={busy} disabled={!valid}>
            {t('common:actions.save')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function CourseFormModal({
  opened,
  course,
  onClose,
  onSaved,
}: {
  opened: boolean;
  course: Course | null;
  onClose: () => void;
  onSaved: (c: Course) => void;
}) {
  const { t } = useTranslation('courses');
  return (
    <ResponsiveModal
      opened={opened}
      onClose={onClose}
      title={course ? t('form.editTitle') : t('form.newTitle')}
    >
      {opened && <CourseForm key={course?.id ?? 'new'} course={course} onClose={onClose} onSaved={onSaved} />}
    </ResponsiveModal>
  );
}

// ───────────── Nivel ─────────────

function LevelForm({
  courseId,
  level,
  onClose,
  onSaved,
}: {
  courseId: number;
  level: CourseLevel | null;
  onClose: () => void;
  onSaved: (c: Course) => void;
}) {
  const { t } = useTranslation(['courses', 'common']);
  const [name, setName] = useState(level?.name ?? '');
  const [description, setDescription] = useState(level?.description ?? '');
  const initialTeacher: PersonOption | null = level?.teacher
    ? { id: level.teacher.id, firstName: level.teacher.name, lastName: '', phone: null }
    : null;
  const [teacher, setTeacher] = useState<PersonOption | null>(initialTeacher);
  const [isActive, setIsActive] = useState(level?.isActive ?? true);
  const { busy, error, submit } = useSubmit(onSaved);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        const body = {
          name: name.trim(),
          description: description.trim() || null,
          teacherPersonId: teacher?.id ?? null,
        };
        void submit(() =>
          level
            ? coursesApi.updateLevel(level.id, { ...body, isActive })
            : coursesApi.addLevel(courseId, body),
        );
      }}
    >
      <Stack>
        <FormError error={error} />
        <TextInput
          label={t('levelForm.name')}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          maxLength={100}
          required
          data-autofocus
        />
        <Textarea
          label={t('levelForm.description')}
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          autosize
          minRows={2}
          maxLength={500}
        />
        <PersonPicker
          label={t('levelForm.teacher')}
          description={t('levelForm.teacherHint')}
          placeholder={t('levelForm.teacherPlaceholder')}
          value={teacher}
          onChange={(p: PersonListItem | null) => setTeacher(p)}
        />
        {level && (
          <Switch
            label={t('levelForm.active')}
            description={t('levelForm.activeHint')}
            checked={isActive}
            onChange={(e) => setIsActive(e.currentTarget.checked)}
          />
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={busy} disabled={!name.trim()}>
            {t('common:actions.save')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function LevelFormModal({
  opened,
  courseId,
  level,
  onClose,
  onSaved,
}: {
  opened: boolean;
  courseId: number;
  level: CourseLevel | null;
  onClose: () => void;
  onSaved: (c: Course) => void;
}) {
  const { t } = useTranslation('courses');
  return (
    <ResponsiveModal
      opened={opened}
      onClose={onClose}
      title={level ? t('levelForm.editTitle') : t('levelForm.newTitle')}
    >
      {opened && (
        <LevelForm
          key={level?.id ?? 'new'}
          courseId={courseId}
          level={level}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </ResponsiveModal>
  );
}

// ───────────── Inscribir ─────────────

function EnrollForm({
  levelId,
  onClose,
  onSaved,
}: {
  levelId: number;
  onClose: () => void;
  onSaved: (r: { created: number; skipped: number }) => void;
}) {
  const { t } = useTranslation(['courses', 'common']);
  const [people, setPeople] = useState<PersonListItem[]>([]);
  const [date, setDate] = useState(todayIso());
  const { busy, error, submit } = useSubmit(onSaved);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!people.length) return;
        void submit(() =>
          coursesApi.enroll(
            levelId,
            people.map((p) => p.id),
            date,
          ),
        );
      }}
    >
      <Stack>
        <FormError error={error} />
        <PersonPicker
          // Se vuelve a montar al agregar a alguien: así la búsqueda queda vacía para el siguiente.
          key={people.length}
          label={t('enroll.add')}
          placeholder={t('enroll.search')}
          value={null}
          exclude={people.map((p) => p.id)}
          onChange={(p) => p && setPeople((ps) => [...ps, p])}
          data-autofocus
        />
        {people.length > 0 ? (
          <Group gap={6}>
            {people.map((p) => (
              <Badge
                key={p.id}
                variant="light"
                size="lg"
                tt="none"
                rightSection={
                  <CloseButton
                    size="xs"
                    aria-label={t('enroll.remove', { name: fullName(p) })}
                    onClick={() => setPeople((ps) => ps.filter((x) => x.id !== p.id))}
                  />
                }
              >
                {fullName(p)}
              </Badge>
            ))}
          </Group>
        ) : (
          <Text size="sm" c="dimmed">
            {t('enroll.none')}
          </Text>
        )}
        <TextInput
          type="date"
          label={t('enroll.date')}
          value={date}
          onChange={(e) => setDate(e.currentTarget.value)}
          required
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={busy} disabled={!people.length || !date}>
            {people.length ? t('enroll.confirm', { count: people.length }) : t('enroll.button')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function EnrollModal({
  levelId,
  title,
  onClose,
  onSaved,
}: {
  /** null = cerrado. */
  levelId: number | null;
  title: string;
  onClose: () => void;
  onSaved: (r: { created: number; skipped: number }) => void;
}) {
  return (
    <ResponsiveModal opened={levelId !== null} onClose={onClose} title={title}>
      {levelId !== null && <EnrollForm key={levelId} levelId={levelId} onClose={onClose} onSaved={onSaved} />}
    </ResponsiveModal>
  );
}
