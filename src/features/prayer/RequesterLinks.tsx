import { Alert, Badge, Button, Card, Divider, Group, Radio, Stack, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconLink, IconUserPlus } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../api/http';
import { prayerApi, type PrayerRequest, type PrayerRequester, type PrayerVisibility } from '../../api/prayer';
import { AnchorLink } from '../../components/links';
import { FormError } from '../../components/FormError';
import { ResponsiveModal } from '../../components/ResponsiveModal';
import { errorMessage } from '../../i18n/errors';
import { fullName } from '../people/format';
import { PersonPicker } from '../people/PersonPicker';

/**
 * Para los pastores, en las del formulario: la ficha de quien pidió (vincular una sugerida o buscada,
 * crearla o desvincular) y con quién se comparte (solo pastores, su líder o el muro).
 */
export function RequesterLinks({
  p,
  requester,
  canCreatePerson,
}: {
  p: PrayerRequest;
  requester: PrayerRequester;
  canCreatePerson: boolean;
}) {
  const { t } = useTranslation(['prayer', 'people']);
  const queryClient = useQueryClient();
  const options = useQuery({
    queryKey: ['prayer', 'link-options', p.id],
    queryFn: () => prayerApi.linkOptions(p.id),
  });
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);

  const run = async (action: () => Promise<unknown>, message?: string) => {
    setBusy(true);
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: ['prayer'] });
      if (message) notifications.show({ color: 'teal', message });
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const leaders = options.data?.leaders ?? [];
  const wall = requester.wallShare;

  return (
    <Card withBorder radius="lg">
      <Stack gap="sm">
        <Text fw={600}>{t('links.personTitle')}</Text>
        <FormError error={options.error} />
        {requester.person ? (
          <Group justify="space-between" gap="xs">
            <Text size="sm">
              {t('links.linkedTo')}{' '}
              <AnchorLink to="/personas/$id" params={{ id: String(requester.person.id) }} fw={600}>
                {requester.person.name}
              </AnchorLink>
            </Text>
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              loading={busy}
              onClick={() => void run(() => prayerApi.unlinkPerson(p.id))}
            >
              {t('links.unlink')}
            </Button>
          </Group>
        ) : (
          <Stack gap="xs">
            <Text size="xs" c="dimmed">
              {t('links.personHint')}
            </Text>
            {options.data?.suggestions.map((s) => (
              <Group key={s.id} justify="space-between" gap="xs" wrap="nowrap">
                <div style={{ minWidth: 0 }}>
                  <Text size="sm" fw={600} truncate>
                    {fullName(s)}
                  </Text>
                  <Group gap={4}>
                    {s.reasons.map((r) => (
                      <Badge key={r} size="xs" variant="light" color="gray" tt="none">
                        {t(`people:duplicates.reasons.${r}`)}
                      </Badge>
                    ))}
                  </Group>
                </div>
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconLink size={14} />}
                  loading={busy}
                  onClick={() => void run(() => prayerApi.linkPerson(p.id, s.id), t('links.linked'))}
                >
                  {t('links.link')}
                </Button>
              </Group>
            ))}
            <PersonPicker
              value={null}
              placeholder={t('links.search')}
              aria-label={t('links.search')}
              onChange={(person) => {
                if (person) void run(() => prayerApi.linkPerson(p.id, person.id), t('links.linked'));
              }}
            />
            {canCreatePerson && (
              <Group>
                <Button
                  size="xs"
                  variant="subtle"
                  leftSection={<IconUserPlus size={14} />}
                  onClick={() => setCreating(true)}
                >
                  {t('links.create')}
                </Button>
              </Group>
            )}
          </Stack>
        )}

        <Divider />
        <Radio.Group
          label={t('links.shareTitle')}
          value={p.visibility}
          onChange={(v) => void run(() => prayerApi.share(p.id, v as PrayerVisibility), t('links.shared'))}
        >
          <Stack gap="sm" mt="xs">
            <Radio value="pastors" label={t('visibility.pastors')} disabled={busy} />
            <Radio
              value="leader"
              label={t('links.leader')}
              description={
                leaders.length ? t('links.leaderTo', { names: leaders.join(', ') }) : t('links.leaderMissing')
              }
              disabled={busy || !leaders.length}
            />
            <Radio
              value="public"
              label={t('links.wall')}
              description={t(`links.wallShare.${wall ?? 'no'}`)}
              disabled={busy || !wall}
            />
          </Stack>
        </Radio.Group>
      </Stack>
      {creating && (
        <CreatePersonModal
          p={p}
          name={options.data?.name ?? { firstName: requester.name ?? '', lastName: '' }}
          onClose={() => setCreating(false)}
          onCreated={async () => {
            setCreating(false);
            notifications.show({ color: 'teal', message: t('links.created') });
            await queryClient.invalidateQueries({ queryKey: ['prayer'] });
          }}
        />
      )}
    </Card>
  );
}

/** Crear la ficha con el contacto que dejó; si parece duplicada, avisa y deja crearla igual. */
function CreatePersonModal({
  p,
  name,
  onClose,
  onCreated,
}: {
  p: PrayerRequest;
  name: { firstName: string; lastName: string };
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const { t } = useTranslation(['prayer', 'people', 'common']);
  const [firstName, setFirstName] = useState(name.firstName);
  const [lastName, setLastName] = useState(name.lastName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const duplicate = error instanceof ApiError && error.code === 'PERSON_DUPLICATE_SUSPECTED';

  const save = async (allowDuplicate: boolean) => {
    setSaving(true);
    setError(null);
    try {
      await prayerApi.createPerson(p.id, { firstName, lastName, allowDuplicate });
      await onCreated();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveModal opened onClose={onClose} title={t('links.createTitle')}>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t('links.createHint')}
        </Text>
        {duplicate ? (
          <Alert color="yellow" variant="light" title={t('people:duplicates.strongTitle')}>
            {t('links.duplicateHint')}
          </Alert>
        ) : (
          <FormError error={error} />
        )}
        <TextInput
          label={t('people:publicForm.firstName')}
          required
          value={firstName}
          onChange={(e) => setFirstName(e.currentTarget.value)}
        />
        <TextInput
          label={t('people:publicForm.lastName')}
          required
          value={lastName}
          onChange={(e) => setLastName(e.currentTarget.value)}
        />
        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          {duplicate ? (
            <Button color="yellow" loading={saving} onClick={() => void save(true)}>
              {t('people:duplicates.createAnyway')}
            </Button>
          ) : (
            <Button
              loading={saving}
              disabled={!firstName.trim() || !lastName.trim()}
              onClick={() => void save(false)}
            >
              {t('links.createConfirm')}
            </Button>
          )}
        </Group>
      </Stack>
    </ResponsiveModal>
  );
}
