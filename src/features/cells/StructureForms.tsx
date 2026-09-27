import { Button, CheckIcon, ColorSwatch, Group, Input, Select, Stack, Tabs, TextInput } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { networksApi, zonesApi, type Network, type PersonRef, type Zone } from '../../api/cells';
import { FormError } from '../../components/FormError';
import { campusesQuery } from '../people/catalog';
import { PersonPicker, type PersonOption } from '../people/PersonPicker';
import { NETWORK_COLORS, networksQuery, useStructureLabels } from './structure';

/** Pestañas Redes / Zonas (con los nombres que usa la iglesia). */
export function StructureTabs({ value }: { value: 'redes' | 'zonas' }) {
  const labels = useStructureLabels();
  const navigate = useNavigate();
  return (
    <Tabs
      value={value}
      onChange={(v) => v && void navigate({ to: v === 'redes' ? '/estructura/redes' : '/estructura/zonas' })}
      mb="md"
    >
      <Tabs.List>
        <Tabs.Tab value="redes">{labels.networks}</Tabs.Tab>
        <Tabs.Tab value="zonas">{labels.zones}</Tabs.Tab>
      </Tabs.List>
    </Tabs>
  );
}

const asOption = (p: PersonRef | null): PersonOption | null => (p ? { ...p, phone: null } : null);

function FormActions({ busy, disabled, onClose }: { busy: boolean; disabled: boolean; onClose: () => void }) {
  const { t } = useTranslation('common');
  return (
    <Group justify="flex-end">
      <Button variant="default" onClick={onClose}>
        {t('actions.cancel')}
      </Button>
      <Button type="submit" loading={busy} disabled={disabled}>
        {t('actions.save')}
      </Button>
    </Group>
  );
}

export function NetworkForm({
  network,
  onClose,
  onSaved,
}: {
  network: Network | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation('cells');
  const campuses = useQuery(campusesQuery());
  const [name, setName] = useState(network?.name ?? '');
  const [color, setColor] = useState<string | null>(network?.color ?? NETWORK_COLORS[0]);
  const [campusId, setCampusId] = useState<string | null>(network?.campus ? String(network.campus.id) : null);
  const [leader, setLeader] = useState<PersonOption | null>(asOption(network?.leader ?? null));
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const activeCampuses = (campuses.data ?? []).filter((c) => c.isActive);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setBusy(true);
        try {
          const body = {
            name: name.trim(),
            color,
            campusId: campusId ? Number(campusId) : null,
            leaderPersonId: leader?.id ?? null,
          };
          if (network) await networksApi.update(network.id, body);
          else await networksApi.create(body);
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
          label={t('structure.name')}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          maxLength={100}
          required
          data-autofocus
        />
        <Input.Wrapper label={t('structure.color')}>
          <Group gap={8} mt={4}>
            {NETWORK_COLORS.map((c) => (
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
            data={activeCampuses.map((c) => ({ value: String(c.id), label: c.name }))}
            value={campusId}
            onChange={setCampusId}
            clearable
          />
        )}
        <PersonPicker
          label={t('structure.leader')}
          placeholder={t('form.searchPerson')}
          value={leader}
          onChange={setLeader}
        />
        <FormActions busy={busy} disabled={!name.trim()} onClose={onClose} />
      </Stack>
    </form>
  );
}

export function ZoneForm({
  zone,
  onClose,
  onSaved,
}: {
  zone: Zone | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation('cells');
  const labels = useStructureLabels();
  const networks = useQuery(networksQuery());
  const [name, setName] = useState(zone?.name ?? '');
  const [networkId, setNetworkId] = useState<string | null>(zone ? String(zone.network.id) : null);
  const [supervisor, setSupervisor] = useState<PersonOption | null>(asOption(zone?.supervisor ?? null));
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const options = (networks.data ?? [])
    .filter((n) => n.isActive || String(n.id) === networkId)
    .map((n) => ({ value: String(n.id), label: n.name }));

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!networkId) return;
        setError(null);
        setBusy(true);
        try {
          const body = {
            name: name.trim(),
            networkId: Number(networkId),
            supervisorPersonId: supervisor?.id ?? null,
          };
          if (zone) await zonesApi.update(zone.id, body);
          else await zonesApi.create(body);
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
          label={t('structure.name')}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          maxLength={100}
          required
          data-autofocus
        />
        <Select label={labels.network} data={options} value={networkId} onChange={setNetworkId} required />
        <PersonPicker
          label={t('structure.supervisor')}
          placeholder={t('form.searchPerson')}
          value={supervisor}
          onChange={setSupervisor}
        />
        <FormActions busy={busy} disabled={!name.trim() || !networkId} onClose={onClose} />
      </Stack>
    </form>
  );
}
