import {
  Alert,
  Button,
  Checkbox,
  Divider,
  Group,
  List,
  MultiSelect,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconCopy } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { AnchorLink } from '../../components/links';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { ApiError } from '../../api/http';
import {
  MARITAL_STATUSES,
  peopleApi,
  type DuplicateResult,
  type PersonDetail,
  type PersonInput,
} from '../../api/people';
import { FormError } from '../../components/FormError';
import { ResponsiveModal } from '../../components/ResponsiveModal';
import { campusesQuery, tagsQuery, useCatalogOptions } from './catalog';
import { fullName, todayIso } from './format';

const optional = z.string().trim();
const schema = z.object({
  firstName: z.string().trim().min(1, 'required').max(80),
  lastName: z.string().trim().min(1, 'required').max(80),
  preferredName: optional.max(80),
  gender: z.enum(['', 'F', 'M']),
  birthDate: optional,
  email: z.union([z.literal(''), z.string().trim().pipe(z.email('email'))]),
  phone: optional.max(30),
  city: optional.max(100),
  province: optional.max(100),
  campusId: optional,
  statusId: optional,
  tagIds: z.array(z.string()),
  firstVisitAt: optional,
  notes: optional.max(4000),
  documentNumber: optional.max(20),
  maritalStatus: optional,
  address: optional.max(250),
  pastoralNotes: optional.max(8000),
  consent: z.boolean(),
});
type Values = z.infer<typeof schema>;

const toValues = (p: PersonDetail | null): Values => ({
  firstName: p?.firstName ?? '',
  lastName: p?.lastName ?? '',
  preferredName: p?.preferredName ?? '',
  gender: p?.gender ?? '',
  birthDate: p?.birthDate ?? '',
  email: p?.email ?? '',
  phone: p?.phone ?? '',
  city: p?.city ?? '',
  province: p?.province ?? '',
  campusId: p?.campus ? String(p.campus.id) : '',
  statusId: '',
  tagIds: [],
  firstVisitAt: p?.firstVisitAt ?? '',
  notes: p?.notes ?? '',
  documentNumber: p?.documentNumber ?? '',
  maritalStatus: p?.maritalStatus ?? '',
  address: p?.address ?? '',
  pastoralNotes: p?.pastoralNotes ?? '',
  consent: Boolean(p?.consentAt),
});

const orNull = (v: string) => (v.trim() === '' ? null : v.trim());

function toInput(v: Values, withSensitive: boolean): PersonInput {
  return {
    firstName: v.firstName,
    lastName: v.lastName,
    preferredName: orNull(v.preferredName),
    gender: v.gender === '' ? null : v.gender,
    birthDate: orNull(v.birthDate),
    email: orNull(v.email),
    phone: orNull(v.phone),
    city: orNull(v.city),
    province: orNull(v.province),
    campusId: v.campusId ? Number(v.campusId) : null,
    firstVisitAt: orNull(v.firstVisitAt),
    notes: orNull(v.notes),
    ...(withSensitive
      ? {
          documentNumber: orNull(v.documentNumber),
          maritalStatus: (orNull(v.maritalStatus) as PersonInput['maritalStatus']) ?? null,
          address: orNull(v.address),
          pastoralNotes: orNull(v.pastoralNotes),
        }
      : {}),
  };
}

function DuplicateList({ result, onPick }: { result: DuplicateResult; onPick?: () => void }) {
  const { t } = useTranslation('people');
  return (
    <>
      {result.items.length > 0 && (
        <List size="sm" spacing={4} mt={6}>
          {result.items.map((d) => (
            <List.Item key={d.id}>
              <AnchorLink to="/personas/$id" params={{ id: String(d.id) }} onClick={onPick}>
                {fullName(d)}
              </AnchorLink>{' '}
              <Text span size="xs" c="dimmed">
                ({d.reasons.map((r) => t(`duplicates.reasons.${r}`)).join(', ')})
              </Text>
            </List.Item>
          ))}
        </List>
      )}
      {result.hiddenCount > 0 && (
        <Text size="xs" c="dimmed" mt={4}>
          {t('duplicates.hidden', { count: result.hiddenCount })}
        </Text>
      )}
    </>
  );
}

type Props = {
  person: PersonDetail | null;
  canSensitive: boolean;
  onClose: () => void;
  onSaved: (person: PersonDetail) => void;
};

function PersonForm({ person, canSensitive, onClose, onSaved }: Props) {
  const { t } = useTranslation(['people', 'common', 'errors']);
  const [error, setError] = useState<unknown>(null);
  const [blocked, setBlocked] = useState<DuplicateResult | null>(null);
  const topId = useId();
  // El aviso de duplicado o el error aparecen arriba: se lleva la vista hasta ahí.
  const showTop = () =>
    requestAnimationFrame(() =>
      document.getElementById(topId)?.scrollIntoView({ block: 'start', behavior: 'smooth' }),
    );
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(person) });
  const statusOptions = useCatalogOptions('person_status');
  const tags = useQuery(tagsQuery());
  const campuses = useQuery(campusesQuery());
  const creating = !person;

  // Aviso de posibles duplicados mientras se completa el alta.
  const [firstName, lastName, email, phone] = useWatch({
    control: form.control,
    name: ['firstName', 'lastName', 'email', 'phone'],
  });
  const [criteria] = useDebouncedValue({ firstName, lastName, email, phone }, 500);
  const hasCriteria =
    (criteria.firstName.trim().length > 1 && criteria.lastName.trim().length > 1) ||
    criteria.email.includes('@') ||
    criteria.phone.replace(/\D/g, '').length >= 6;
  const duplicates = useQuery({
    queryKey: ['people', 'duplicates', criteria],
    queryFn: () =>
      peopleApi.duplicates({
        firstName: criteria.firstName || undefined,
        lastName: criteria.lastName || undefined,
        email: criteria.email || undefined,
        phone: criteria.phone || undefined,
      }),
    enabled: creating && hasCriteria,
    staleTime: 30_000,
  });

  const save = async (v: Values, allowDuplicate: boolean) => {
    setError(null);
    try {
      const input = toInput(v, canSensitive);
      const saved = creating
        ? await peopleApi.create({
            ...input,
            statusId: v.statusId ? Number(v.statusId) : undefined,
            tagIds: v.tagIds.map(Number),
            consent: v.consent,
            allowDuplicate,
          })
        : await peopleApi.update(person.id, {
            ...input,
            ...(v.consent !== Boolean(person.consentAt) ? { consent: v.consent } : {}),
          });
      onSaved(saved);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'PERSON_DUPLICATE_SUSPECTED') {
        setBlocked(err.details as DuplicateResult);
        showTop();
        return;
      }
      setError(err);
      showTop();
    }
  };
  const submit = form.handleSubmit((v) => save(v, false));

  const msg = (name: keyof Values) => {
    const m = form.formState.errors[name]?.message;
    return m ? t(`errors:validation.${m}` as never) : undefined;
  };
  const selectProps = { comboboxProps: { withinPortal: true } };
  const hint = duplicates.data && (duplicates.data.items.length > 0 || duplicates.data.hiddenCount > 0);

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap="md">
        <div id={topId} />
        <FormError error={error} />
        {blocked ? (
          <Alert color="orange" icon={<IconCopy size={18} />} title={t('duplicates.strongTitle')}>
            <Text size="sm">{t('duplicates.body')}</Text>
            <DuplicateList result={blocked} onPick={onClose} />
            <Group mt="sm">
              <Button
                size="xs"
                variant="white"
                color="orange"
                loading={form.formState.isSubmitting}
                onClick={() => void form.handleSubmit((v) => save(v, true))()}
              >
                {t('duplicates.createAnyway')}
              </Button>
            </Group>
          </Alert>
        ) : (
          hint && (
            <Alert
              color={duplicates.data!.strong ? 'orange' : 'blue'}
              variant="light"
              title={t('duplicates.title')}
            >
              <DuplicateList result={duplicates.data!} onPick={onClose} />
            </Alert>
          )
        )}

        <Divider label={t('form.basic')} labelPosition="left" />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label={t('form.firstName')}
            required
            data-autofocus
            error={msg('firstName')}
            {...form.register('firstName')}
          />
          <TextInput
            label={t('form.lastName')}
            required
            error={msg('lastName')}
            {...form.register('lastName')}
          />
          <TextInput label={t('form.preferredName')} {...form.register('preferredName')} />
          <Controller
            control={form.control}
            name="gender"
            render={({ field }) => (
              <Select
                label={t('form.gender')}
                placeholder={t('form.none')}
                clearable
                data={(['F', 'M'] as const).map((g) => ({ value: g, label: t(`gender.${g}`) }))}
                value={field.value || null}
                onChange={(v) => field.onChange(v ?? '')}
                {...selectProps}
              />
            )}
          />
          <TextInput
            label={t('form.birthDate')}
            type="date"
            max={todayIso()}
            {...form.register('birthDate')}
          />
        </SimpleGrid>

        <Divider label={t('form.contact')} labelPosition="left" />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label={t('form.phone')}
            description={t('form.phoneHint')}
            type="tel"
            inputMode="tel"
            autoComplete="off"
            {...form.register('phone')}
          />
          <TextInput
            label={t('form.email')}
            type="email"
            inputMode="email"
            autoComplete="off"
            error={msg('email')}
            {...form.register('email')}
          />
          <TextInput label={t('form.city')} {...form.register('city')} />
          <TextInput label={t('form.province')} {...form.register('province')} />
        </SimpleGrid>

        <Divider label={t('form.church')} labelPosition="left" />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          {creating && (
            <Controller
              control={form.control}
              name="statusId"
              render={({ field }) => (
                <Select
                  label={t('form.status')}
                  placeholder={statusOptions[0]?.label}
                  data={statusOptions}
                  value={field.value || null}
                  onChange={(v) => field.onChange(v ?? '')}
                  {...selectProps}
                />
              )}
            />
          )}
          {(campuses.data?.length ?? 0) > 1 && (
            <Controller
              control={form.control}
              name="campusId"
              render={({ field }) => (
                <Select
                  label={t('form.campus')}
                  placeholder={t('form.none')}
                  clearable
                  data={(campuses.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
                  value={field.value || null}
                  onChange={(v) => field.onChange(v ?? '')}
                  {...selectProps}
                />
              )}
            />
          )}
          <TextInput
            label={t('form.firstVisitAt')}
            type="date"
            max={todayIso()}
            {...form.register('firstVisitAt')}
          />
          {creating && (tags.data?.length ?? 0) > 0 && (
            <Controller
              control={form.control}
              name="tagIds"
              render={({ field }) => (
                <MultiSelect
                  label={t('form.tags')}
                  data={(tags.data ?? []).map((tg) => ({ value: String(tg.id), label: tg.name }))}
                  value={field.value}
                  onChange={field.onChange}
                  searchable
                  clearable
                  {...selectProps}
                />
              )}
            />
          )}
        </SimpleGrid>
        <Textarea label={t('form.notes')} autosize minRows={2} maxRows={6} {...form.register('notes')} />

        {canSensitive && (
          <>
            <Divider label={t('form.sensitive')} labelPosition="left" />
            <Text size="xs" c="dimmed" mt={-8}>
              {t('form.sensitiveHint')}
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label={t('form.documentNumber')}
                inputMode="numeric"
                autoComplete="off"
                {...form.register('documentNumber')}
              />
              <Controller
                control={form.control}
                name="maritalStatus"
                render={({ field }) => (
                  <Select
                    label={t('form.maritalStatus')}
                    placeholder={t('form.none')}
                    clearable
                    data={MARITAL_STATUSES.map((m) => ({ value: m, label: t(`marital.${m}`) }))}
                    value={field.value || null}
                    onChange={(v) => field.onChange(v ?? '')}
                    {...selectProps}
                  />
                )}
              />
            </SimpleGrid>
            <TextInput label={t('form.address')} autoComplete="off" {...form.register('address')} />
            <Textarea
              label={t('form.pastoralNotes')}
              autosize
              minRows={2}
              maxRows={8}
              {...form.register('pastoralNotes')}
            />
          </>
        )}

        <Checkbox
          label={t('form.consent')}
          description={t('form.consentHint')}
          {...form.register('consent')}
        />

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={form.formState.isSubmitting}>
            {t('common:actions.save')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

/** Alta (person = null) o edición de los datos de una persona. */
export function PersonFormModal({ opened, ...props }: Props & { opened: boolean }) {
  const { t } = useTranslation('people');
  return (
    <ResponsiveModal
      opened={opened}
      onClose={props.onClose}
      title={props.person ? t('form.editTitle') : t('form.createTitle')}
    >
      <PersonForm key={props.person?.id ?? 'new'} {...props} />
    </ResponsiveModal>
  );
}
