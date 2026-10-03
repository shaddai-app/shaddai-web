import { Button, Checkbox, Group, Radio, Stack, Text, Textarea } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { prayerApi, type PrayerRequest, type PrayerVisibility } from '../../api/prayer';
import { FormError } from '../../components/FormError';
import { ResponsiveModal } from '../../components/ResponsiveModal';
import { prayerContextQuery } from './queries';

function PrayerForm({
  request,
  onClose,
  onSaved,
}: {
  request: PrayerRequest | null;
  onClose: () => void;
  onSaved: (p: PrayerRequest) => void;
}) {
  const { t } = useTranslation(['prayer', 'common']);
  const context = useQuery(prayerContextQuery());
  const leaders = context.data?.leaders ?? [];
  const [body, setBody] = useState(request?.body ?? '');
  const [visibility, setVisibility] = useState<PrayerVisibility>(request?.visibility ?? 'public');
  const [anonymous, setAnonymous] = useState(request?.anonymous ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  // Sin líder no se puede elegir "para mi líder" (salvo que ya lo fuera: se muestra para no perderlo).
  const noLeader = context.isSuccess && leaders.length === 0;
  const valid = body.trim() !== '' && !(visibility === 'leader' && noLeader);

  const option = (value: PrayerVisibility, description: string, disabled = false) => (
    <Radio value={value} label={t(`visibility.${value}`)} description={description} disabled={disabled} />
  );

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        setBusy(true);
        setError(null);
        const input = { body: body.trim(), visibility, anonymous: visibility === 'public' && anonymous };
        try {
          onSaved(request ? await prayerApi.update(request.id, input) : await prayerApi.create(input));
        } catch (err) {
          setError(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Stack gap="md">
        <FormError error={error} />
        <Textarea
          label={t('form.body')}
          placeholder={t('form.bodyPlaceholder')}
          value={body}
          onChange={(e) => setBody(e.currentTarget.value)}
          autosize
          minRows={4}
          maxRows={10}
          maxLength={1000}
          required
          data-autofocus
        />
        <Radio.Group
          label={t('form.visibility')}
          value={visibility}
          onChange={(v) => setVisibility(v as PrayerVisibility)}
        >
          <Stack gap="sm" mt="xs">
            {option('public', t('form.publicHint'))}
            {option(
              'leader',
              noLeader ? t('form.noLeader') : t('form.leaderHint', { names: leaders.join(', ') }),
              noLeader && request?.visibility !== 'leader',
            )}
            {option('pastors', t('form.pastorsHint'))}
          </Stack>
        </Radio.Group>
        {visibility === 'public' && (
          <Checkbox
            label={t('form.anonymous')}
            description={t('form.anonymousHint')}
            checked={anonymous}
            onChange={(e) => setAnonymous(e.currentTarget.checked)}
          />
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={busy} disabled={!valid}>
            {request ? t('common:actions.save') : t('form.share')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function PrayerFormModal({
  opened,
  request,
  onClose,
  onSaved,
}: {
  opened: boolean;
  request: PrayerRequest | null;
  onClose: () => void;
  onSaved: (p: PrayerRequest) => void;
}) {
  const { t } = useTranslation('prayer');
  return (
    <ResponsiveModal
      opened={opened}
      onClose={onClose}
      title={request ? t('form.editTitle') : t('form.newTitle')}
    >
      {opened && (
        <PrayerForm key={request?.id ?? 'new'} request={request} onClose={onClose} onSaved={onSaved} />
      )}
    </ResponsiveModal>
  );
}

function AnswerForm({
  request,
  onClose,
  onSaved,
}: {
  request: PrayerRequest;
  onClose: () => void;
  onSaved: (p: PrayerRequest) => void;
}) {
  const { t } = useTranslation(['prayer', 'common']);
  const [testimony, setTestimony] = useState(request.testimony ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          onSaved(
            await prayerApi.update(request.id, {
              status: 'answered',
              testimony: testimony.trim() || null,
            }),
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
        <Text size="sm">{t('answer.intro')}</Text>
        <Textarea
          label={t('answer.testimony')}
          placeholder={t('answer.testimonyPlaceholder')}
          value={testimony}
          onChange={(e) => setTestimony(e.currentTarget.value)}
          autosize
          minRows={3}
          maxRows={8}
          maxLength={1000}
          data-autofocus
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={busy} color="teal">
            {t('answer.confirm')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

/** Marcar la petición como respondida, con un testimonio opcional. */
export function AnswerModal({
  request,
  onClose,
  onSaved,
}: {
  request: PrayerRequest | null;
  onClose: () => void;
  onSaved: (p: PrayerRequest) => void;
}) {
  const { t } = useTranslation('prayer');
  return (
    <ResponsiveModal opened={request !== null} onClose={onClose} title={t('answer.title')}>
      {request && <AnswerForm key={request.id} request={request} onClose={onClose} onSaved={onSaved} />}
    </ResponsiveModal>
  );
}
