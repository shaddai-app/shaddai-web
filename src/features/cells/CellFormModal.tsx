import { Button, Divider, Group, Select, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cellsApi, type CellCore, type CellInput } from '../../api/cells';
import { meQuery } from '../../auth/session';
import { FormError } from '../../components/FormError';
import { ResponsiveModal } from '../../components/ResponsiveModal';
import { campusesQuery } from '../people/catalog';
import { PersonPicker, type PersonOption } from '../people/PersonPicker';
import { MapPicker } from './Map';
import type { LatLng } from './map-utils';
import { useStructureLabels, weekdayOptions, zonesQuery } from './structure';

interface FormState {
  name: string;
  code: string;
  zoneId: string | null;
  campusId: string | null;
  meetingDay: string | null;
  meetingTime: string;
  address: string;
  neighborhood: string;
  city: string;
  point: LatLng | null;
  leader: PersonOption | null;
  coLeader: PersonOption | null;
  host: PersonOption | null;
  startedAt: string;
}

const initial = (c: CellCore | null): FormState => ({
  name: c?.name ?? '',
  code: c?.code ?? '',
  zoneId: c ? String(c.zone.id) : null,
  campusId: c?.campus ? String(c.campus.id) : null,
  meetingDay: c ? String(c.meetingDay) : null,
  meetingTime: c?.meetingTime ?? '20:00',
  address: c?.address ?? '',
  neighborhood: c?.neighborhood ?? '',
  city: c?.city ?? '',
  point: c?.lat != null && c.lng != null ? { lat: c.lat, lng: c.lng } : null,
  leader: c?.leader ?? null,
  coLeader: c?.coLeader ?? null,
  host: c?.host ?? null,
  startedAt: c?.startedAt ?? '',
});

const orNull = (v: string) => (v.trim() === '' ? null : v.trim());

function CellForm({
  cell,
  onClose,
  onSaved,
}: {
  cell: CellCore | null;
  onClose: () => void;
  onSaved: (cell: CellCore) => void;
}) {
  const { t } = useTranslation(['cells', 'common']);
  const { data: me } = useSuspenseQuery(meQuery());
  const labels = useStructureLabels();
  const zones = useQuery(zonesQuery());
  const campuses = useQuery(campusesQuery());
  const [f, setF] = useState<FormState>(() => initial(cell));
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setF((prev) => ({ ...prev, [key]: value }));

  // Sin permiso de dirección (solo al editar) no se muestran ni se mandan calle y coordenadas.
  const withAddress = !cell || cell.access.address;
  const valid =
    f.name.trim() &&
    f.zoneId &&
    f.meetingDay !== null &&
    f.meetingTime &&
    f.leader &&
    (!withAddress || f.address.trim());

  // Zonas activas agrupadas por red (más la actual, aunque esté inactiva).
  const zoneGroups = Object.values(
    (zones.data ?? [])
      .filter((z) => z.isActive || String(z.id) === f.zoneId)
      .reduce<Record<string, { group: string; items: { value: string; label: string }[] }>>((acc, z) => {
        const g = (acc[z.network.id] ??= { group: z.network.name, items: [] });
        g.items.push({ value: String(z.id), label: z.name });
        return acc;
      }, {}),
  );
  const activeCampuses = (campuses.data ?? []).filter((c) => c.isActive);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const body: Partial<CellInput> = {
        name: f.name.trim(),
        code: orNull(f.code),
        zoneId: Number(f.zoneId),
        campusId: f.campusId ? Number(f.campusId) : null,
        meetingDay: Number(f.meetingDay),
        meetingTime: f.meetingTime,
        neighborhood: orNull(f.neighborhood),
        city: orNull(f.city),
        leaderPersonId: f.leader!.id,
        coLeaderPersonId: f.coLeader?.id ?? null,
        hostPersonId: f.host?.id ?? null,
        startedAt: orNull(f.startedAt),
        ...(withAddress
          ? { address: f.address.trim(), lat: f.point?.lat ?? null, lng: f.point?.lng ?? null }
          : {}),
      };
      onSaved(cell ? await cellsApi.update(cell.id, body) : await cellsApi.create(body));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) void submit();
      }}
    >
      <Stack>
        <FormError error={error} />
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <TextInput
            label={t('form.name')}
            value={f.name}
            onChange={(e) => set('name', e.currentTarget.value)}
            maxLength={100}
            required
            data-autofocus
            style={{ gridColumn: 'span 2' }}
          />
          <TextInput
            label={t('form.code')}
            placeholder={t('form.codeHint')}
            value={f.code}
            onChange={(e) => set('code', e.currentTarget.value)}
            maxLength={20}
          />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, sm: activeCampuses.length > 1 ? 2 : 1 }}>
          <Select
            label={labels.zone}
            data={zoneGroups}
            value={f.zoneId}
            onChange={(v) => set('zoneId', v)}
            searchable
            required
            nothingFoundMessage={t('form.noZones')}
          />
          {activeCampuses.length > 1 && (
            <Select
              label={t('form.campus')}
              data={activeCampuses.map((c) => ({ value: String(c.id), label: c.name }))}
              value={f.campusId}
              onChange={(v) => set('campusId', v)}
              clearable
            />
          )}
        </SimpleGrid>
        <SimpleGrid cols={{ base: 2, sm: 3 }}>
          <Select
            label={t('form.meetingDay')}
            data={weekdayOptions(me.account?.weekStartsOn)}
            value={f.meetingDay}
            onChange={(v) => set('meetingDay', v)}
            required
          />
          <TextInput
            type="time"
            label={t('form.meetingTime')}
            value={f.meetingTime}
            onChange={(e) => set('meetingTime', e.currentTarget.value)}
            required
          />
          <TextInput
            type="date"
            label={t('form.startedAt')}
            value={f.startedAt}
            onChange={(e) => set('startedAt', e.currentTarget.value)}
          />
        </SimpleGrid>

        <Divider label={t('form.people')} labelPosition="left" />
        <PersonPicker
          label={t('form.leader')}
          placeholder={t('form.searchPerson')}
          value={f.leader}
          onChange={(p) => set('leader', p)}
          required
        />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <PersonPicker
            label={t('form.coLeader')}
            placeholder={t('form.searchPerson')}
            value={f.coLeader}
            onChange={(p) => set('coLeader', p)}
            exclude={f.leader ? [f.leader.id] : []}
          />
          <PersonPicker
            label={t('form.host')}
            placeholder={t('form.searchPerson')}
            value={f.host}
            onChange={(p) => set('host', p)}
          />
        </SimpleGrid>
        {!cell && (
          <Text size="xs" c="dimmed">
            {t('form.peopleHint')}
          </Text>
        )}

        <Divider label={t('form.location')} labelPosition="left" />
        {withAddress && (
          <TextInput
            label={t('form.address')}
            value={f.address}
            onChange={(e) => set('address', e.currentTarget.value)}
            maxLength={250}
            required
          />
        )}
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label={t('form.neighborhood')}
            value={f.neighborhood}
            onChange={(e) => set('neighborhood', e.currentTarget.value)}
            maxLength={100}
          />
          <TextInput
            label={t('form.city')}
            value={f.city}
            onChange={(e) => set('city', e.currentTarget.value)}
            maxLength={100}
          />
        </SimpleGrid>
        {withAddress ? (
          <MapPicker value={f.point} onChange={(p) => set('point', p)} address={f.address} />
        ) : (
          <Text size="xs" c="dimmed">
            {t('form.addressHidden')}
          </Text>
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

export function CellFormModal({
  opened,
  cell,
  onClose,
  onSaved,
}: {
  opened: boolean;
  cell: CellCore | null;
  onClose: () => void;
  onSaved: (cell: CellCore) => void;
}) {
  const { t } = useTranslation('cells');
  return (
    <ResponsiveModal
      opened={opened}
      onClose={onClose}
      title={cell ? t('form.editTitle') : t('form.createTitle')}
    >
      {opened && <CellForm cell={cell} onClose={onClose} onSaved={onSaved} />}
    </ResponsiveModal>
  );
}
