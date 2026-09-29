import {
  Button,
  CheckIcon,
  ColorSwatch,
  Group,
  Input,
  Select,
  Stack,
  Switch,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MINISTRY_KINDS, ministriesApi, type Ministry, type MinistryKind } from '../../api/ministries';
import type { PersonListItem } from '../../api/people';
import { FormError } from '../../components/FormError';
import { ResponsiveModal } from '../../components/ResponsiveModal';
import { campusesQuery } from '../people/catalog';
import { PersonPicker } from '../people/PersonPicker';
import { MINISTRY_COLORS } from './common';

function MinistryForm({
  ministry,
  onClose,
  onSaved,
}: {
  ministry: Ministry | null;
  onClose: () => void;
  onSaved: (m: Ministry) => void;
}) {
  const { t } = useTranslation(['ministries', 'common']);
  const campuses = useQuery(campusesQuery());
  const activeCampuses = (campuses.data ?? []).filter((c) => c.isActive);
  const [name, setName] = useState(ministry?.name ?? '');
  const [description, setDescription] = useState(ministry?.description ?? '');
  const [kind, setKind] = useState<MinistryKind>(ministry?.kind ?? 'general');
  const [color, setColor] = useState<string | null>(ministry?.color ?? MINISTRY_COLORS[0]);
  const [campusId, setCampusId] = useState<string | null>(
    ministry?.campus ? String(ministry.campus.id) : null,
  );
  const [isActive, setIsActive] = useState(ministry?.isActive ?? true);
  const [withDefaultRoles, setWithDefaultRoles] = useState(true);
  const [leader, setLeader] = useState<PersonListItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setBusy(true);
        setError(null);
        const body = {
          name: name.trim(),
          description: description.trim() || null,
          kind,
          color,
          campusId: campusId ? Number(campusId) : null,
        };
        try {
          onSaved(
            ministry
              ? await ministriesApi.update(ministry.id, { ...body, isActive })
              : await ministriesApi.create({ ...body, withDefaultRoles, leaderPersonId: leader?.id ?? null }),
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
        <TextInput
          label={t('form.name')}
          placeholder={t('form.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          maxLength={100}
          required
          data-autofocus
        />
        <Select
          label={t('form.kind')}
          description={ministry ? undefined : t('form.kindHint')}
          data={MINISTRY_KINDS.map((k) => ({ value: k, label: t(`kinds.${k}`) }))}
          value={kind}
          onChange={(v) => v && setKind(v as MinistryKind)}
          allowDeselect={false}
        />
        {!ministry && kind !== 'general' && (
          <Switch
            label={t('form.defaultRoles')}
            checked={withDefaultRoles}
            onChange={(e) => setWithDefaultRoles(e.currentTarget.checked)}
          />
        )}
        {!ministry && (
          <PersonPicker
            label={t('form.leader')}
            placeholder={t('form.leaderPlaceholder')}
            value={leader}
            onChange={setLeader}
          />
        )}
        <Textarea
          label={t('form.description')}
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          maxLength={500}
          autosize
          minRows={2}
        />
        <Input.Wrapper label={t('form.color')}>
          <Group gap={8} mt={4}>
            {MINISTRY_COLORS.map((c) => (
              <ColorSwatch
                key={c}
                component="button"
                type="button"
                color={`var(--mantine-color-${c}-6)`}
                onClick={() => setColor(c)}
                aria-label={c}
                aria-pressed={color === c}
                style={{ cursor: 'pointer', color: 'white' }}
                size={28}
              >
                {color === c && <CheckIcon size={12} />}
              </ColorSwatch>
            ))}
          </Group>
        </Input.Wrapper>
        {activeCampuses.length > 1 && (
          <Select
            label={t('form.campus')}
            placeholder={t('form.allCampuses')}
            data={activeCampuses.map((c) => ({ value: String(c.id), label: c.name }))}
            value={campusId}
            onChange={setCampusId}
            clearable
          />
        )}
        {ministry && (
          <Switch
            label={t('form.active')}
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

/** Alta y edición de un ministerio. */
export function MinistryFormModal({
  opened,
  ministry,
  onClose,
  onSaved,
}: {
  opened: boolean;
  ministry: Ministry | null;
  onClose: () => void;
  onSaved: (m: Ministry) => void;
}) {
  const { t } = useTranslation('ministries');
  return (
    <ResponsiveModal
      opened={opened}
      onClose={onClose}
      title={ministry ? t('form.editTitle') : t('form.newTitle')}
      size="md"
    >
      {opened && <MinistryForm ministry={ministry} onClose={onClose} onSaved={onSaved} />}
    </ResponsiveModal>
  );
}
