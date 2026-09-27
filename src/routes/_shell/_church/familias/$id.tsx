import {
  ActionIcon,
  Alert,
  Anchor,
  Button,
  Card,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconLock, IconPencil, IconTrash, IconUserMinus } from '@tabler/icons-react';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { householdsApi, type Household } from '../../../../api/people';
import { requirePermission } from '../../../../auth/guards';
import { can } from '../../../../auth/permissions';
import { meQuery } from '../../../../auth/session';
import { FormError } from '../../../../components/FormError';
import { MemberRow } from '../../../../features/people/FamilyPanel';
import { fullName } from '../../../../features/people/format';
import { errorMessage } from '../../../../i18n/errors';

export const Route = createFileRoute('/_shell/_church/familias/$id')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'personas.ver'),
  component: HouseholdPage,
});

function EditForm({ household, onDone }: { household: Household; onDone: (h: Household | null) => void }) {
  const { t } = useTranslation(['people', 'common']);
  const [values, setValues] = useState({
    name: household.name,
    city: household.city ?? '',
    province: household.province ?? '',
    address: household.address ?? '',
    postalCode: household.postalCode ?? '',
  });
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: e.currentTarget.value }));
  const orNull = (s: string) => (s.trim() === '' ? null : s.trim());

  const save = async () => {
    setError(null);
    setBusy(true);
    try {
      const updated = await householdsApi.update(household.id, {
        name: values.name.trim(),
        city: orNull(values.city),
        province: orNull(values.province),
        ...(household.access.sensitive
          ? { address: orNull(values.address), postalCode: orNull(values.postalCode) }
          : {}),
      });
      onDone(updated);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack>
      <FormError error={error} />
      <TextInput
        label={t('family.name')}
        value={values.name}
        onChange={set('name')}
        maxLength={120}
        required
      />
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <TextInput label={t('family.city')} value={values.city} onChange={set('city')} maxLength={100} />
        <TextInput
          label={t('family.province')}
          value={values.province}
          onChange={set('province')}
          maxLength={100}
        />
        {household.access.sensitive && (
          <>
            <TextInput
              label={t('family.address')}
              value={values.address}
              onChange={set('address')}
              maxLength={250}
            />
            <TextInput
              label={t('family.postalCode')}
              value={values.postalCode}
              onChange={set('postalCode')}
              maxLength={10}
            />
          </>
        )}
      </SimpleGrid>
      <Group justify="flex-end">
        <Button variant="default" onClick={() => onDone(null)}>
          {t('common:actions.cancel')}
        </Button>
        <Button loading={busy} disabled={!values.name.trim()} onClick={() => void save()}>
          {t('common:actions.save')}
        </Button>
      </Group>
    </Stack>
  );
}

function HouseholdPage() {
  const { t } = useTranslation(['people', 'common']);
  const id = Number(Route.useParams().id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me } = useSuspenseQuery(meQuery());
  const canEdit = can(me, 'personas.editar');
  const [editing, setEditing] = useState(false);
  const key = ['households', 'detail', id];
  const query = useQuery({ queryKey: key, queryFn: () => householdsApi.get(id) });

  if (query.isPending) return <Loader />;
  if (query.error) return <FormError error={query.error} />;
  const household = query.data;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['households'] });
    void queryClient.invalidateQueries({ queryKey: ['people'] });
  };

  const removeMember = (personId: number, name: string) =>
    modals.openConfirmModal({
      title: t('family.leaveTitle', { name }),
      labels: { confirm: t('family.leave'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await householdsApi.removeMember(id, personId);
          notifications.show({ color: 'teal', message: t('family.memberRemoved') });
          invalidate();
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  const dissolve = () =>
    modals.openConfirmModal({
      title: t('family.dissolveTitle'),
      children: <Text size="sm">{t('family.dissolveBody')}</Text>,
      labels: { confirm: t('family.dissolve'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await householdsApi.remove(id);
          notifications.show({ color: 'teal', message: t('family.dissolved') });
          invalidate();
          void navigate({ to: '/personas' });
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  return (
    <>
      <Anchor size="sm" c="dimmed" onClick={() => window.history.back()} component="button">
        <Group gap={4}>
          <IconArrowLeft size={14} />
          {t('family.back')}
        </Group>
      </Anchor>

      <Card withBorder radius="lg" mt="sm" mb="md">
        {editing ? (
          <EditForm
            household={household}
            onDone={(h) => {
              setEditing(false);
              if (h) {
                queryClient.setQueryData(key, h);
                notifications.show({ color: 'teal', message: t('common:saved') });
                invalidate();
              }
            }}
          />
        ) : (
          <Group justify="space-between" align="flex-start">
            <Stack gap={4}>
              <Title order={1} size="h2">
                {household.name}
              </Title>
              <Text size="sm" c="dimmed">
                {[
                  t('family.members', { count: household.members.length }),
                  household.city,
                  household.province,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              {household.access.sensitive
                ? household.address && (
                    <Text size="sm">
                      {household.address}
                      {household.postalCode ? ` (${household.postalCode})` : ''}
                    </Text>
                  )
                : null}
            </Stack>
            {canEdit && (
              <Group gap="xs">
                <Button
                  variant="default"
                  leftSection={<IconPencil size={16} />}
                  onClick={() => setEditing(true)}
                >
                  {t('detail.edit')}
                </Button>
                <Tooltip label={t('family.dissolve')}>
                  <ActionIcon
                    variant="default"
                    size="lg"
                    color="red"
                    aria-label={t('family.dissolve')}
                    onClick={dissolve}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            )}
          </Group>
        )}
      </Card>

      {!household.access.sensitive && (
        <Alert color="gray" variant="light" icon={<IconLock size={18} />} mb="md">
          {t('family.addressHidden')}
        </Alert>
      )}

      <Card withBorder radius="lg">
        {household.members.length === 0 ? (
          <Text c="dimmed">{t('family.empty')}</Text>
        ) : (
          <Stack gap="sm">
            {household.members.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                action={
                  canEdit && (
                    <Tooltip label={t('family.leave')}>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        aria-label={t('family.leave')}
                        onClick={() => removeMember(m.id, fullName(m))}
                      >
                        <IconUserMinus size={18} />
                      </ActionIcon>
                    </Tooltip>
                  )
                }
              />
            ))}
          </Stack>
        )}
      </Card>
    </>
  );
}
