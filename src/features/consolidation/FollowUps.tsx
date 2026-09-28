import {
  ActionIcon,
  Button,
  Card,
  Collapse,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconBrandWhatsapp,
  IconHandStop,
  IconHome,
  IconMessage,
  IconNotes,
  IconPhone,
  IconPlus,
  IconTrash,
  type Icon,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { casesApi, FOLLOW_UP_TYPES, type FollowUp, type FollowUpType } from '../../api/consolidation';
import { FormError } from '../../components/FormError';
import { errorMessage } from '../../i18n/errors';
import { formatDate, fullName, todayIso } from '../people/format';

const TYPE_ICONS: Record<FollowUpType, Icon> = {
  call: IconPhone,
  visit: IconHome,
  whatsapp: IconBrandWhatsapp,
  message: IconMessage,
  prayer: IconHandStop,
  other: IconNotes,
};

const orNull = (v: string) => (v.trim() === '' ? null : v.trim());

function FollowUpForm({ personId, onSaved }: { personId: number; onSaved: (items: FollowUp[]) => void }) {
  const { t } = useTranslation(['consolidation', 'common']);
  const [type, setType] = useState<FollowUpType>('call');
  const [date, setDate] = useState(todayIso());
  const [notes, setNotes] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextActionAt, setNextActionAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const { items } = await casesApi.addFollowUp(personId, {
            type,
            date,
            notes: orNull(notes),
            nextAction: orNull(nextAction),
            nextActionAt: orNull(nextActionAt),
          });
          setNotes('');
          setNextAction('');
          setNextActionAt('');
          onSaved(items);
        } catch (err) {
          setError(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Stack gap="sm">
        <FormError error={error} />
        <SimpleGrid cols={2} spacing="sm">
          <Select
            label={t('followUps.type')}
            data={FOLLOW_UP_TYPES.map((v) => ({ value: v, label: t(`followUps.types.${v}`) }))}
            value={type}
            onChange={(v) => v && setType(v as FollowUpType)}
            allowDeselect={false}
          />
          <TextInput
            type="date"
            label={t('followUps.date')}
            value={date}
            max={todayIso()}
            onChange={(e) => setDate(e.currentTarget.value)}
            required
          />
        </SimpleGrid>
        <Textarea
          label={t('followUps.notes')}
          placeholder={t('followUps.notesPlaceholder')}
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
          maxLength={2000}
          autosize
          minRows={2}
        />
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
          <TextInput
            label={t('followUps.nextAction')}
            placeholder={t('followUps.nextActionPlaceholder')}
            value={nextAction}
            onChange={(e) => setNextAction(e.currentTarget.value)}
            maxLength={200}
          />
          <TextInput
            type="date"
            label={t('followUps.nextActionAt')}
            value={nextActionAt}
            min={date}
            onChange={(e) => setNextActionAt(e.currentTarget.value)}
          />
        </SimpleGrid>
        <Group justify="flex-end">
          <Button type="submit" loading={busy} disabled={!date}>
            {t('followUps.save')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function FollowUpsPanel({
  personId,
  items,
  canAdd,
  onChange,
}: {
  personId: number;
  items: FollowUp[];
  canAdd: boolean;
  onChange: (items: FollowUp[]) => void;
}) {
  const { t } = useTranslation(['consolidation', 'common']);
  const [adding, setAdding] = useState(false);

  const remove = (f: FollowUp) =>
    modals.openConfirmModal({
      title: t('followUps.deleteTitle'),
      labels: { confirm: t('followUps.delete'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await casesApi.removeFollowUp(f.id);
          onChange(items.filter((x) => x.id !== f.id));
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  return (
    <Card withBorder radius="lg">
      <Group justify="space-between" mb="sm">
        <Title order={3} size="h5">
          {t('followUps.title')}
        </Title>
        {canAdd && !adding && (
          <Button
            size="compact-sm"
            variant="light"
            leftSection={<IconPlus size={14} />}
            onClick={() => setAdding(true)}
          >
            {t('followUps.add')}
          </Button>
        )}
      </Group>
      <Collapse expanded={adding}>
        <Card withBorder radius="md" mb="md" bg="var(--mantine-color-default-hover)">
          <FollowUpForm
            personId={personId}
            onSaved={(next) => {
              setAdding(false);
              onChange(next);
              notifications.show({ color: 'teal', message: t('followUps.saved') });
            }}
          />
        </Card>
      </Collapse>
      {items.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t('followUps.empty')}
        </Text>
      ) : (
        <Stack gap="sm">
          {items.map((f) => {
            const TypeIcon = TYPE_ICONS[f.type];
            return (
              <Group key={f.id} align="flex-start" wrap="nowrap" gap="sm">
                <ThemeIcon variant="light" radius="xl" size="md">
                  <TypeIcon size={16} />
                </ThemeIcon>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Group justify="space-between" gap="xs" wrap="nowrap">
                    <Text size="sm" fw={500}>
                      {t(`followUps.types.${f.type}`)} · {formatDate(f.date)}
                    </Text>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      aria-label={t('followUps.delete')}
                      onClick={() => remove(f)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                  {f.notes && (
                    <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                      {f.notes}
                    </Text>
                  )}
                  {(f.nextAction || f.nextActionAt) && (
                    <Text size="xs" c="blue">
                      {t('followUps.next', {
                        action: f.nextAction ?? t('followUps.contactAgain'),
                        date: formatDate(f.nextActionAt) ?? '—',
                      })}
                    </Text>
                  )}
                  {f.createdBy && (
                    <Text size="xs" c="dimmed">
                      {fullName(f.createdBy)}
                    </Text>
                  )}
                </div>
              </Group>
            );
          })}
        </Stack>
      )}
    </Card>
  );
}
