import {
  Button,
  Group,
  MultiSelect,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  announcementsApi,
  type Announcement,
  type Audience,
  type AudienceKind,
} from '../../api/announcements';
import { FormError } from '../../components/FormError';
import { ResponsiveModal } from '../../components/ResponsiveModal';
import { audienceOptionsQuery } from './queries';

/** Valor de un <input type="datetime-local"> (hora del dispositivo) ↔ instante ISO. */
const toLocalInput = (iso: string | null | undefined) => (iso ? dayjs(iso).format('YYYY-MM-DDTHH:mm') : '');
const fromLocalInput = (value: string) => (value ? dayjs(value).toISOString() : null);

function AnnouncementForm({
  announcement,
  onClose,
  onSaved,
}: {
  announcement: Announcement | null;
  onClose: () => void;
  onSaved: (a: Announcement) => void;
}) {
  const { t } = useTranslation(['announcements', 'common']);
  const options = useQuery(audienceOptionsQuery());
  const scheduled = announcement ? dayjs(announcement.publishAt).isAfter(dayjs()) : false;
  const [title, setTitle] = useState(announcement?.title ?? '');
  const [body, setBody] = useState(announcement?.body ?? '');
  const [when, setWhen] = useState<'now' | 'later'>(scheduled ? 'later' : 'now');
  const [publishAt, setPublishAt] = useState(scheduled ? toLocalInput(announcement?.publishAt) : '');
  const [expiresAt, setExpiresAt] = useState(toLocalInput(announcement?.expiresAt));
  const [pinned, setPinned] = useState(announcement?.pinned ?? false);
  const [notify, setNotify] = useState(announcement?.notify ?? true);
  const initial = announcement?.audiences ?? [];
  const [target, setTarget] = useState<'all' | 'some'>(initial.length ? 'some' : 'all');
  const pick = (kind: AudienceKind) => initial.filter((a) => a.kind === kind).map((a) => String(a.refId));
  const [roles, setRoles] = useState<string[]>(pick('role'));
  const [ministries, setMinistries] = useState<string[]>(pick('ministry'));
  const [campuses, setCampuses] = useState<string[]>(pick('campus'));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const audiences: Audience[] =
    target === 'all'
      ? []
      : [
          ...roles.map((id) => ({ kind: 'role' as const, refId: Number(id) })),
          ...ministries.map((id) => ({ kind: 'ministry' as const, refId: Number(id) })),
          ...campuses.map((id) => ({ kind: 'campus' as const, refId: Number(id) })),
        ];
  const alreadyNotified = Boolean(announcement?.notifiedAt);
  const valid =
    title.trim() !== '' &&
    body.trim() !== '' &&
    (when === 'now' || publishAt !== '') &&
    (target === 'all' || audiences.length > 0);
  const data = (list: { id: number; name: string }[] = []) =>
    list.map((o) => ({ value: String(o.id), label: o.name }));

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        setBusy(true);
        setError(null);
        const input = {
          title: title.trim(),
          body: body.trim(),
          // "Ahora" en una edición no mueve la fecha de algo ya publicado.
          ...(when === 'later'
            ? { publishAt: fromLocalInput(publishAt)! }
            : !announcement || scheduled
              ? { publishAt: new Date().toISOString() }
              : {}),
          expiresAt: fromLocalInput(expiresAt),
          pinned,
          notify,
          audiences,
        };
        try {
          onSaved(
            announcement
              ? await announcementsApi.update(announcement.id, input)
              : await announcementsApi.create(input),
          );
        } catch (err) {
          setError(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Stack gap="md">
        <FormError error={error} />
        <TextInput
          label={t('form.title')}
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          maxLength={150}
          required
          data-autofocus
        />
        <Textarea
          label={t('form.body')}
          value={body}
          onChange={(e) => setBody(e.currentTarget.value)}
          autosize
          minRows={4}
          maxRows={12}
          maxLength={4000}
          required
        />

        <Stack gap={6}>
          <Text size="sm" fw={500}>
            {t('form.when')}
          </Text>
          <SegmentedControl
            value={when}
            onChange={(v) => setWhen(v as 'now' | 'later')}
            data={[
              { value: 'now', label: t('form.now') },
              { value: 'later', label: t('form.later') },
            ]}
          />
        </Stack>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          {when === 'later' && (
            <TextInput
              type="datetime-local"
              label={t('form.publishAt')}
              value={publishAt}
              onChange={(e) => setPublishAt(e.currentTarget.value)}
              required
            />
          )}
          <TextInput
            type="datetime-local"
            label={t('form.expiresAt')}
            description={t('form.expiresHint')}
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.currentTarget.value)}
          />
        </SimpleGrid>

        <Stack gap={6}>
          <Text size="sm" fw={500}>
            {t('form.audience')}
          </Text>
          <SegmentedControl
            value={target}
            onChange={(v) => setTarget(v as 'all' | 'some')}
            data={[
              { value: 'all', label: t('form.everyone') },
              { value: 'some', label: t('form.some') },
            ]}
          />
          {target === 'some' && (
            <Stack gap="xs">
              <Text size="xs" c="dimmed">
                {t('form.someHint')}
              </Text>
              <MultiSelect
                label={t('form.roles')}
                data={data(options.data?.roles)}
                value={roles}
                onChange={setRoles}
                searchable
                clearable
              />
              <MultiSelect
                label={t('form.ministries')}
                data={data(options.data?.ministries)}
                value={ministries}
                onChange={setMinistries}
                searchable
                clearable
              />
              {(options.data?.campuses.length ?? 0) > 1 && (
                <MultiSelect
                  label={t('form.campuses')}
                  data={data(options.data?.campuses)}
                  value={campuses}
                  onChange={setCampuses}
                  clearable
                />
              )}
            </Stack>
          )}
        </Stack>

        <Switch
          label={t('form.pinned')}
          checked={pinned}
          onChange={(e) => setPinned(e.currentTarget.checked)}
        />
        <Switch
          label={t('form.notify')}
          description={alreadyNotified ? t('form.alreadyNotified') : t('form.notifyHint')}
          checked={notify}
          disabled={alreadyNotified}
          onChange={(e) => setNotify(e.currentTarget.checked)}
        />

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={busy} disabled={!valid}>
            {announcement
              ? t('common:actions.save')
              : when === 'later'
                ? t('form.schedule')
                : t('form.publish')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function AnnouncementFormModal({
  opened,
  announcement,
  onClose,
  onSaved,
}: {
  opened: boolean;
  announcement: Announcement | null;
  onClose: () => void;
  onSaved: (a: Announcement) => void;
}) {
  const { t } = useTranslation('announcements');
  return (
    <ResponsiveModal
      opened={opened}
      onClose={onClose}
      title={announcement ? t('form.editTitle') : t('form.newTitle')}
    >
      {opened && (
        <AnnouncementForm
          key={announcement?.id ?? 'new'}
          announcement={announcement}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </ResponsiveModal>
  );
}
