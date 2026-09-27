import {
  ActionIcon,
  Button,
  Card,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconHome, IconUserMinus, IconUserPlus } from '@tabler/icons-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { AnchorLink } from '../../components/links';
import { useTranslation } from 'react-i18next';
import {
  HOUSEHOLD_ROLES,
  householdsApi,
  type HouseholdMember,
  type HouseholdRole,
  type PersonDetail,
  type PersonListItem,
} from '../../api/people';
import { FormError } from '../../components/FormError';
import { errorMessage } from '../../i18n/errors';
import { fullName, useAgeLabel } from './format';
import { PersonAvatar } from './PersonBits';
import { PersonPicker } from './PersonPicker';

function RoleSelect({
  value,
  onChange,
  label,
}: {
  value: HouseholdRole | null;
  onChange: (v: HouseholdRole | null) => void;
  label?: string;
}) {
  const { t } = useTranslation('people');
  return (
    <Select
      label={label ?? t('family.role')}
      placeholder={t('form.none')}
      clearable
      data={HOUSEHOLD_ROLES.map((r) => ({ value: r, label: t(`householdRole.${r}`) }))}
      value={value}
      onChange={(v) => onChange(v as HouseholdRole | null)}
      comboboxProps={{ withinPortal: true }}
    />
  );
}

export function MemberRow({ member, action }: { member: HouseholdMember; action?: React.ReactNode }) {
  const { t } = useTranslation('people');
  const ageLabel = useAgeLabel();
  return (
    <Group justify="space-between" wrap="nowrap">
      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
        <PersonAvatar person={member} size={36} />
        <div style={{ minWidth: 0 }}>
          <AnchorLink to="/personas/$id" params={{ id: String(member.id) }} size="sm" fw={500}>
            {fullName(member)}
          </AnchorLink>
          <Text size="xs" c="dimmed">
            {[
              member.householdRole ? t(`householdRole.${member.householdRole}`) : null,
              ageLabel(member.birthDate),
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </div>
      </Group>
      {action}
    </Group>
  );
}

/** Buscador de familias existentes. */
function HouseholdSelect({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const { t } = useTranslation('people');
  const [search, setSearch] = useState('');
  const [debounced] = useDebouncedValue(search, 300);
  const results = useQuery({
    queryKey: ['households', 'picker', debounced],
    queryFn: () => householdsApi.list({ q: debounced || undefined, pageSize: 15 }),
    placeholderData: keepPreviousData,
  });
  return (
    <Select
      label={t('family.searchFamily')}
      searchable
      clearable
      filter={({ options }) => options}
      searchValue={search}
      onSearchChange={setSearch}
      data={(results.data?.items ?? []).map((h) => ({
        value: String(h.id),
        label: `${h.name}${h.city ? ` (${h.city})` : ''}`,
      }))}
      value={value}
      onChange={onChange}
      comboboxProps={{ withinPortal: true }}
    />
  );
}

/** Sin familia: crear una nueva o sumarse a una existente. */
function NoFamily({ person, onChanged }: { person: PersonDetail; onChanged: () => void }) {
  const { t } = useTranslation(['people', 'common']);
  const [mode, setMode] = useState<'create' | 'join' | null>(null);
  const [name, setName] = useState(t('family.defaultName', { lastName: person.lastName }));
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [role, setRole] = useState<HouseholdRole | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === 'create') {
        await householdsApi.create({ name: name.trim(), members: [{ personId: person.id, role }] });
        notifications.show({ color: 'teal', message: t('family.created') });
      } else if (householdId) {
        await householdsApi.addMember(Number(householdId), { personId: person.id, role });
        notifications.show({ color: 'teal', message: t('family.memberAdded') });
      }
      onChanged();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  if (!mode) {
    return (
      <Group>
        <Button leftSection={<IconHome size={16} />} onClick={() => setMode('create')}>
          {t('family.create')}
        </Button>
        <Button variant="default" onClick={() => setMode('join')}>
          {t('family.join')}
        </Button>
      </Group>
    );
  }
  return (
    <Stack>
      <FormError error={error} />
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        {mode === 'create' ? (
          <TextInput
            label={t('family.name')}
            placeholder={t('family.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            maxLength={120}
            data-autofocus
          />
        ) : (
          <HouseholdSelect value={householdId} onChange={setHouseholdId} />
        )}
        <RoleSelect value={role} onChange={setRole} />
      </SimpleGrid>
      <Group justify="flex-end">
        <Button variant="default" onClick={() => setMode(null)}>
          {t('common:actions.cancel')}
        </Button>
        <Button
          loading={busy}
          disabled={mode === 'create' ? !name.trim() : !householdId}
          onClick={() => void submit()}
        >
          {t('common:actions.save')}
        </Button>
      </Group>
    </Stack>
  );
}

export function FamilyPanel({ person, onChanged }: { person: PersonDetail; onChanged: () => void }) {
  const { t } = useTranslation(['people', 'common']);
  const household = person.household;
  const canEdit = person.access.edit;
  const [adding, setAdding] = useState(false);
  const [newMember, setNewMember] = useState<PersonListItem | null>(null);
  const [newRole, setNewRole] = useState<HouseholdRole | null>(null);
  const [busy, setBusy] = useState(false);

  if (!household) {
    return (
      <Card withBorder radius="lg">
        <Stack>
          <Text c="dimmed">{t('family.none')}</Text>
          {canEdit && <NoFamily person={person} onChanged={onChanged} />}
        </Stack>
      </Card>
    );
  }

  const leave = () =>
    modals.openConfirmModal({
      title: t('family.leaveTitle', { name: fullName(person) }),
      labels: { confirm: t('family.leave'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await householdsApi.removeMember(household.id, person.id);
          notifications.show({ color: 'teal', message: t('family.memberRemoved') });
          onChanged();
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  const add = async () => {
    if (!newMember) return;
    setBusy(true);
    try {
      await householdsApi.addMember(household.id, { personId: newMember.id, role: newRole });
      notifications.show({ color: 'teal', message: t('family.memberAdded') });
      setAdding(false);
      setNewMember(null);
      setNewRole(null);
      onChanged();
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const self: HouseholdMember = { ...person, householdRole: person.householdRole };

  return (
    <Card withBorder radius="lg">
      <Stack gap="md">
        <Group justify="space-between">
          <div>
            <AnchorLink to="/familias/$id" params={{ id: String(household.id) }} fw={600}>
              {household.name}
            </AnchorLink>
            <Text size="xs" c="dimmed">
              {t('family.members', { count: household.members.length + 1 })}
            </Text>
          </div>
          {canEdit && (
            <Button
              size="xs"
              variant="light"
              leftSection={<IconUserPlus size={16} />}
              onClick={() => setAdding((a) => !a)}
            >
              {t('family.addMember')}
            </Button>
          )}
        </Group>

        {adding && (
          <Stack gap="sm">
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <PersonPicker
                label={t('family.searchPerson')}
                value={newMember}
                onChange={setNewMember}
                exclude={[person.id, ...household.members.map((m) => m.id)]}
              />
              <RoleSelect value={newRole} onChange={setNewRole} />
            </SimpleGrid>
            <Group justify="flex-end">
              <Button variant="default" size="xs" onClick={() => setAdding(false)}>
                {t('common:actions.cancel')}
              </Button>
              <Button size="xs" loading={busy} disabled={!newMember} onClick={() => void add()}>
                {t('common:actions.save')}
              </Button>
            </Group>
          </Stack>
        )}

        <Stack gap="sm">
          <MemberRow
            member={self}
            action={
              canEdit && (
                <Tooltip label={t('family.leave')}>
                  <ActionIcon variant="subtle" color="red" aria-label={t('family.leave')} onClick={leave}>
                    <IconUserMinus size={18} />
                  </ActionIcon>
                </Tooltip>
              )
            }
          />
          {household.members.map((m) => (
            <MemberRow key={m.id} member={m} />
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}
