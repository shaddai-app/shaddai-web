import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  Loader,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import { errorMessage } from '../../../../i18n/errors';
import { notifications } from '@mantine/notifications';
import { IconBuildingChurch, IconPencil, IconPlus } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { campusesApi, type Campus } from '../../../../api/people';
import { requirePermission } from '../../../../auth/guards';
import { FormError } from '../../../../components/FormError';
import { ResponsiveModal } from '../../../../components/ResponsiveModal';
import { campusesQuery } from '../../../../features/people/catalog';
import { PageHeader } from '../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/admin/sedes')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'estructura.gestionar'),
  component: CampusesPage,
});

function CampusForm({
  campus,
  onClose,
  onSaved,
}: {
  campus: Campus | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation(['people', 'common']);
  const [name, setName] = useState(campus?.name ?? '');
  const [address, setAddress] = useState(campus?.address ?? '');
  const [isMain, setIsMain] = useState(campus?.isMain ?? false);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setBusy(true);
        try {
          const body = {
            name: name.trim(),
            address: address.trim() || null,
            ...(isMain ? { isMain: true } : {}),
          };
          if (campus) await campusesApi.update(campus.id, body);
          else await campusesApi.create(body);
          onSaved();
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
          label={t('campuses.name')}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          maxLength={100}
          required
          data-autofocus
        />
        <TextInput
          label={t('campuses.address')}
          value={address}
          onChange={(e) => setAddress(e.currentTarget.value)}
          maxLength={250}
        />
        {!campus?.isMain && (
          <Checkbox
            label={t('campuses.makeMain')}
            description={t('campuses.mainHint')}
            checked={isMain}
            onChange={(e) => setIsMain(e.currentTarget.checked)}
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

function CampusesPage() {
  const { t } = useTranslation(['people', 'common']);
  const queryClient = useQueryClient();
  const query = useQuery(campusesQuery());
  const [editing, setEditing] = useState<{ campus: Campus | null } | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['campuses'] });

  const toggle = async (c: Campus, active: boolean) => {
    try {
      await campusesApi.update(c.id, { isActive: active });
      await refresh();
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    }
  };

  return (
    <>
      <PageHeader
        title={t('campuses.title')}
        description={t('campuses.description')}
        actions={
          <Button leftSection={<IconPlus size={18} />} onClick={() => setEditing({ campus: null })}>
            {t('campuses.add')}
          </Button>
        }
      />
      <FormError error={query.error} />
      {query.isPending ? (
        <Loader />
      ) : (
        <Card withBorder radius="lg" p={0}>
          {(query.data ?? []).length === 0 ? (
            <Text c="dimmed" p="md">
              {t('campuses.empty')}
            </Text>
          ) : (
            query.data!.map((c, i) => (
              <Group
                key={c.id}
                justify="space-between"
                wrap="nowrap"
                px="md"
                py="sm"
                style={{ borderTop: i ? '1px solid var(--mantine-color-default-border)' : undefined }}
                opacity={c.isActive ? 1 : 0.55}
              >
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                  <IconBuildingChurch size={20} stroke={1.6} />
                  <div style={{ minWidth: 0 }}>
                    <Group gap={6}>
                      <Text size="sm" fw={500}>
                        {c.name}
                      </Text>
                      {c.isMain && (
                        <Badge size="xs" variant="light">
                          {t('campuses.main')}
                        </Badge>
                      )}
                    </Group>
                    {c.address && (
                      <Text size="xs" c="dimmed" truncate>
                        {c.address}
                      </Text>
                    )}
                  </div>
                </Group>
                <Group gap={4} wrap="nowrap">
                  <Switch
                    size="sm"
                    checked={c.isActive}
                    disabled={c.isMain}
                    aria-label={c.isActive ? t('campuses.active') : t('campuses.inactive')}
                    onChange={(e) => void toggle(c, e.currentTarget.checked)}
                    mr="xs"
                  />
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    aria-label={t('campuses.edit')}
                    onClick={() => setEditing({ campus: c })}
                  >
                    <IconPencil size={16} />
                  </ActionIcon>
                </Group>
              </Group>
            ))
          )}
        </Card>
      )}
      <ResponsiveModal
        opened={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.campus ? t('campuses.edit') : t('campuses.add')}
        size="md"
      >
        {editing && (
          <CampusForm
            campus={editing.campus}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              notifications.show({ color: 'teal', message: t('campuses.saved') });
              void refresh();
            }}
          />
        )}
      </ResponsiveModal>
    </>
  );
}
