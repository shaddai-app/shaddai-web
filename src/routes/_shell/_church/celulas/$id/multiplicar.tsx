import {
  Alert,
  Button,
  Card,
  Checkbox,
  Group,
  Loader,
  Select,
  SimpleGrid,
  Stack,
  Stepper,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { multiplicationApi, type CellDetail } from '../../../../../api/cells';
import { requirePermission } from '../../../../../auth/guards';
import { meQuery } from '../../../../../auth/session';
import { FormError } from '../../../../../components/FormError';
import { MapPicker } from '../../../../../features/cells/Map';
import type { LatLng } from '../../../../../features/cells/map-utils';
import { cellDetailQuery } from '../../../../../features/cells/queries';
import {
  meetingLabel,
  useStructureLabels,
  weekdayOptions,
  zonesQuery,
} from '../../../../../features/cells/structure';
import { fullName, todayIso } from '../../../../../features/people/format';
import { PersonAvatar } from '../../../../../features/people/PersonBits';
import { PersonPicker, type PersonOption } from '../../../../../features/people/PersonPicker';
import { PageHeader } from '../../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/celulas/$id/multiplicar')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'celulas.multiplicar'),
  component: MultiplyPage,
});

const orNull = (v: string) => (v.trim() === '' ? null : v.trim());

function Wizard({ mother }: { mother: CellDetail }) {
  const { t } = useTranslation(['cells', 'common']);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me } = useSuspenseQuery(meQuery());
  const labels = useStructureLabels();
  const zones = useQuery(zonesQuery());
  const [step, setStep] = useState(0);
  // En el celular solo el paso actual lleva nombre (si no, el stepper ocupa dos renglones).
  const narrow = useMediaQuery('(max-width: 36em)');
  const stepLabel = (i: number, key: 'cell' | 'location' | 'members' | 'confirm') =>
    narrow && i !== step ? undefined : t(`multiply.steps.${key}`);
  const [name, setName] = useState('');
  const [zoneId, setZoneId] = useState<string | null>(String(mother.zone.id));
  const [meetingDay, setMeetingDay] = useState<string | null>(String(mother.meetingDay));
  const [meetingTime, setMeetingTime] = useState(mother.meetingTime);
  const [leader, setLeader] = useState<PersonOption | null>(null);
  const [coLeader, setCoLeader] = useState<PersonOption | null>(null);
  const [host, setHost] = useState<PersonOption | null>(null);
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState(mother.city ?? '');
  const [point, setPoint] = useState<LatLng | null>(null);
  const [moving, setMoving] = useState<number[]>([]);
  const [date, setDate] = useState(todayIso());
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  // Líder, colíder y anfitrión pasan siempre (si son de la madre, figuran marcados y fijos).
  const responsible = new Set([leader?.id, coLeader?.id, host?.id].filter((v): v is number => Boolean(v)));
  const candidates = mother.members.filter((m) => m.id !== mother.leader.id);
  const goingIds = new Set([...moving, ...candidates.filter((m) => responsible.has(m.id)).map((m) => m.id)]);
  const fromOutside = [leader, coLeader, host].filter(
    (p): p is PersonOption => Boolean(p) && !mother.members.some((m) => m.id === p!.id),
  );
  const childCount = goingIds.size + new Set(fromOutside.map((p) => p.id)).size;
  const motherKeeps = mother.members.length - goingIds.size;

  const canNext = [
    Boolean(name.trim() && zoneId && meetingDay !== null && meetingTime && leader),
    Boolean(address.trim()),
    true,
    Boolean(date),
  ][step];

  const zoneGroups = Object.values(
    (zones.data ?? [])
      .filter((z) => z.isActive)
      .reduce<Record<string, { group: string; items: { value: string; label: string }[] }>>((acc, z) => {
        const g = (acc[z.network.id] ??= { group: z.network.name, items: [] });
        g.items.push({ value: String(z.id), label: z.name });
        return acc;
      }, {}),
  );

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await multiplicationApi.multiply(mother.id, {
        name: name.trim(),
        zoneId: Number(zoneId),
        meetingDay: Number(meetingDay),
        meetingTime,
        address: address.trim(),
        neighborhood: orNull(neighborhood),
        city: orNull(city),
        lat: point?.lat ?? null,
        lng: point?.lng ?? null,
        leaderPersonId: leader!.id,
        coLeaderPersonId: coLeader?.id ?? null,
        hostPersonId: host?.id ?? null,
        memberIds: [...goingIds],
        date,
        notes: orNull(notes),
      });
      await queryClient.invalidateQueries({ queryKey: ['cells'] });
      notifications.show({ color: 'teal', message: t('multiply.done', { name: res.name }) });
      // La hija puede quedar fuera del alcance de quien multiplicó (tiene otro líder).
      void navigate({ to: '/celulas/$id', params: { id: String(res.visible ? res.id : mother.id) } });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const personField = (
    label: string,
    value: PersonOption | null,
    set: (p: PersonOption | null) => void,
    required = false,
  ) => (
    <PersonPicker
      label={label}
      placeholder={t('form.searchPerson')}
      value={value}
      onChange={set}
      exclude={[mother.leader.id]}
      required={required}
    />
  );

  return (
    <Stack gap="lg">
      <Stepper
        active={step}
        onStepClick={(s) => s < step && setStep(s)}
        size="sm"
        allowNextStepsSelect={false}
      >
        <Stepper.Step label={stepLabel(0, 'cell')}>
          <Stack gap="sm" mt="md">
            <TextInput
              label={t('form.name')}
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              maxLength={100}
              required
              data-autofocus
            />
            <SimpleGrid cols={{ base: 1, sm: 3 }}>
              <Select
                label={labels.zone}
                data={zoneGroups}
                value={zoneId}
                onChange={setZoneId}
                searchable
                required
              />
              <Select
                label={t('form.meetingDay')}
                data={weekdayOptions(me.account?.weekStartsOn)}
                value={meetingDay}
                onChange={setMeetingDay}
                required
              />
              <TextInput
                type="time"
                label={t('form.meetingTime')}
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.currentTarget.value)}
                required
              />
            </SimpleGrid>
            {personField(t('form.leader'), leader, setLeader, true)}
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              {personField(t('form.coLeader'), coLeader, setCoLeader)}
              {personField(t('form.host'), host, setHost)}
            </SimpleGrid>
            <Text size="xs" c="dimmed">
              {t('multiply.leaderHint', { leader: fullName(mother.leader) })}
            </Text>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label={stepLabel(1, 'location')}>
          <Stack gap="sm" mt="md">
            <TextInput
              label={t('form.address')}
              value={address}
              onChange={(e) => setAddress(e.currentTarget.value)}
              maxLength={250}
              required
            />
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label={t('form.neighborhood')}
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.currentTarget.value)}
                maxLength={100}
              />
              <TextInput
                label={t('form.city')}
                value={city}
                onChange={(e) => setCity(e.currentTarget.value)}
                maxLength={100}
              />
            </SimpleGrid>
            <MapPicker
              value={point}
              onChange={setPoint}
              address={address}
              near={mother.lat != null && mother.lng != null ? { lat: mother.lat, lng: mother.lng } : null}
            />
          </Stack>
        </Stepper.Step>

        <Stepper.Step label={stepLabel(2, 'members')}>
          <Stack gap="sm" mt="md">
            <Text size="sm">{t('multiply.membersHint')}</Text>
            {candidates.length === 0 ? (
              <Text size="sm" c="dimmed">
                {t('members.empty')}
              </Text>
            ) : (
              <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs">
                {candidates.map((m) => {
                  const fixed = responsible.has(m.id);
                  const checked = goingIds.has(m.id);
                  return (
                    <Checkbox.Card
                      key={m.id}
                      radius="md"
                      p="sm"
                      checked={checked}
                      disabled={fixed}
                      onClick={() =>
                        !fixed &&
                        setMoving((prev) =>
                          prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id],
                        )
                      }
                    >
                      <Group wrap="nowrap" gap="sm">
                        <Checkbox.Indicator disabled={fixed} />
                        <PersonAvatar person={m} size={30} />
                        <div style={{ minWidth: 0 }}>
                          <Text size="sm" fw={500} truncate>
                            {fullName(m)}
                          </Text>
                          {fixed && (
                            <Text size="xs" c="dimmed">
                              {t('multiply.goesAsResponsible')}
                            </Text>
                          )}
                        </div>
                      </Group>
                    </Checkbox.Card>
                  );
                })}
              </SimpleGrid>
            )}
          </Stack>
        </Stepper.Step>

        <Stepper.Step label={stepLabel(3, 'confirm')}>
          <Stack gap="sm" mt="md">
            <SimpleGrid cols={2} spacing="sm">
              <Card withBorder radius="md" p="sm">
                <Text size="xs" c="dimmed">
                  {mother.name}
                </Text>
                <Text fw={700} size="xl">
                  {t('members.title', { count: motherKeeps })}
                </Text>
                <Text size="xs" c="dimmed">
                  {t('multiply.stays')}
                </Text>
              </Card>
              <Card withBorder radius="md" p="sm">
                <Text size="xs" c="dimmed">
                  {name}
                </Text>
                <Text fw={700} size="xl">
                  {t('members.title', { count: childCount })}
                </Text>
                <Text size="xs" c="dimmed">
                  {meetingDay !== null && meetingLabel(Number(meetingDay), meetingTime)} ·{' '}
                  {leader && fullName(leader)}
                </Text>
              </Card>
            </SimpleGrid>
            <TextInput
              type="date"
              label={t('multiply.date')}
              value={date}
              max={todayIso()}
              onChange={(e) => setDate(e.currentTarget.value)}
              required
            />
            <Textarea
              label={t('report.notes')}
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
              maxLength={500}
              autosize
              minRows={2}
            />
            <FormError error={error} />
          </Stack>
        </Stepper.Step>
      </Stepper>

      <Group justify="space-between">
        <Button
          variant="default"
          onClick={() =>
            step === 0
              ? void navigate({ to: '/celulas/$id', params: { id: String(mother.id) } })
              : setStep(step - 1)
          }
        >
          {step === 0 ? t('common:actions.cancel') : t('common:actions.back')}
        </Button>
        {step < 3 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canNext}>
            {t('common:actions.continue')}
          </Button>
        ) : (
          <Button onClick={() => void submit()} loading={busy} disabled={!canNext}>
            {t('multiply.submit')}
          </Button>
        )}
      </Group>
    </Stack>
  );
}

function MultiplyPage() {
  const { t } = useTranslation('cells');
  const id = Number(Route.useParams().id);
  const { data: me } = useSuspenseQuery(meQuery());
  const cell = useQuery(cellDetailQuery(id, me.user.id));

  if (cell.isPending) return <Loader />;
  if (cell.isError) return <FormError error={cell.error} />;
  const c = cell.data;
  return (
    <Stack>
      <PageHeader
        back={{ to: '/celulas/$id', params: { id: String(id) } }}
        title={t('multiply.title', { name: c.name })}
        description={t('multiply.description')}
      />
      {!c.access.multiply || c.status !== 'active' ? (
        <Alert color="yellow" variant="light">
          {c.status !== 'active' ? t('multiply.notActive') : t('multiply.forbidden')}
        </Alert>
      ) : (
        <>
          {!c.multiplication.ready && (
            <Alert color="blue" variant="light">
              {t('multiply.notReady', { members: c.multiplication.members, target: c.multiplication.target })}
            </Alert>
          )}
          <Wizard mother={c} />
        </>
      )}
    </Stack>
  );
}
