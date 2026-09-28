import {
  Button,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { registrationsApi, type Registration } from '../../api/calendar';
import { PAYMENT_METHODS, type PaymentMethod } from '../../api/finance';
import { FormError } from '../../components/FormError';
import { ResponsiveModal } from '../../components/ResponsiveModal';
import { accountsQuery, useChurchCurrency, useMoney } from '../finance/common';
import { currencySymbol, readLastAccount, rememberAccount, useSeparators } from '../finance/money-input';
import { todayIso } from '../people/format';
import { PersonPicker, type PersonOption } from '../people/PersonPicker';

const orNull = (v: string) => (v.trim() === '' ? null : v.trim());

function AddForm({
  eventId,
  occurrence,
  onClose,
  onSaved,
}: {
  eventId: number;
  occurrence: string;
  onClose: () => void;
  onSaved: (r: Registration) => void;
}) {
  const { t } = useTranslation(['calendar', 'common']);
  const [mode, setMode] = useState<'person' | 'guest'>('person');
  const [person, setPerson] = useState<PersonOption | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const valid = mode === 'person' ? Boolean(person) : Boolean(name.trim() && (email.trim() || phone.trim()));

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        setBusy(true);
        setError(null);
        try {
          onSaved(
            await registrationsApi.create(eventId, {
              occurrence,
              ...(mode === 'person'
                ? { personId: person!.id }
                : { name: name.trim(), email: orNull(email), phone: orNull(phone) }),
              notes: orNull(notes),
            }),
          );
        } catch (err) {
          setError(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Stack>
        <FormError error={error} />
        <SegmentedControl
          fullWidth
          value={mode}
          onChange={(v) => setMode(v as 'person' | 'guest')}
          data={[
            { value: 'person', label: t('registrations.fromPeople') },
            { value: 'guest', label: t('registrations.guest') },
          ]}
        />
        {mode === 'person' ? (
          <PersonPicker
            label={t('registrations.person')}
            value={person}
            onChange={setPerson}
            required
            data-autofocus
          />
        ) : (
          <>
            <TextInput
              label={t('registrations.name')}
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              maxLength={150}
              required
              data-autofocus
            />
            <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
              <TextInput
                type="email"
                label={t('registrations.email')}
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                maxLength={150}
              />
              <TextInput
                type="tel"
                label={t('registrations.phone')}
                value={phone}
                onChange={(e) => setPhone(e.currentTarget.value)}
                maxLength={30}
              />
            </SimpleGrid>
            <Text size="xs" c="dimmed">
              {t('registrations.contactHint')}
            </Text>
          </>
        )}
        <Textarea
          label={t('registrations.notes')}
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
          maxLength={500}
          autosize
          minRows={1}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={busy} disabled={!valid}>
            {t('registrations.add')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function AddRegistrationModal({
  opened,
  eventId,
  occurrence,
  onClose,
  onSaved,
}: {
  opened: boolean;
  eventId: number;
  occurrence: string;
  onClose: () => void;
  onSaved: (r: Registration) => void;
}) {
  const { t } = useTranslation('calendar');
  return (
    <ResponsiveModal opened={opened} onClose={onClose} title={t('registrations.addTitle')} size="md">
      {opened && <AddForm eventId={eventId} occurrence={occurrence} onClose={onClose} onSaved={onSaved} />}
    </ResponsiveModal>
  );
}

function PaymentForm({
  registration,
  price,
  onClose,
  onDone,
}: {
  registration: Registration;
  price: number | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t, i18n } = useTranslation(['calendar', 'finance', 'common']);
  const money = useMoney();
  const separators = useSeparators();
  const currency = useChurchCurrency();
  const accounts = useQuery(accountsQuery());
  const options = (accounts.data ?? []).filter((a) => a.currency === currency);
  const [accountId, setAccountId] = useState<string | null>(readLastAccount());
  const selected = options.find((a) => String(a.id) === accountId) ?? options[0];
  const pending = Math.max((price ?? 0) - (registration.paidAmount ?? 0), 0);
  const [amount, setAmount] = useState<number | ''>(pending || '');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [date, setDate] = useState(todayIso());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const valid = Boolean(selected && amount && Number(amount) > 0 && date);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid || !selected) return;
        setBusy(true);
        setError(null);
        try {
          await registrationsApi.pay(registration.id, {
            financeAccountId: selected.id,
            amount: Number(amount),
            paymentMethod: method,
            date,
          });
          rememberAccount(selected.id);
          onDone();
        } catch (err) {
          setError(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Stack>
        <FormError error={error} />
        <Text size="sm">
          {t('registrations.paymentBody', { name: registration.name })}
          {registration.paidAmount
            ? ` ${t('registrations.alreadyPaid', { amount: money(registration.paidAmount, currency) })}`
            : ''}
        </Text>
        <NumberInput
          label={t('finance:movement.amount')}
          size="lg"
          value={amount}
          onChange={(v) => setAmount(v === '' ? '' : Number(v))}
          prefix={`${currencySymbol(currency, i18n.resolvedLanguage ?? 'es')} `}
          decimalScale={2}
          allowNegative={false}
          inputMode="decimal"
          required
          data-autofocus
          {...separators}
        />
        <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="sm">
          <Select
            label={t('finance:movement.account')}
            data={options.map((a) => ({ value: String(a.id), label: a.name }))}
            value={selected ? String(selected.id) : null}
            onChange={setAccountId}
            allowDeselect={false}
            required
          />
          <Select
            label={t('finance:movement.method')}
            data={PAYMENT_METHODS.map((m) => ({ value: m, label: t(`finance:methods.${m}`) }))}
            value={method}
            onChange={(v) => v && setMethod(v as PaymentMethod)}
            allowDeselect={false}
          />
          <TextInput
            type="date"
            label={t('finance:movement.date')}
            value={date}
            max={todayIso()}
            onChange={(e) => setDate(e.currentTarget.value)}
            required
          />
        </SimpleGrid>
        <Text size="xs" c="dimmed">
          {t('registrations.paymentHint')}
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" color="teal" loading={busy} disabled={!valid}>
            {t('registrations.registerPayment')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

/** Registra lo que pagó un inscripto: genera un ingreso en finanzas. */
export function PaymentModal({
  registration,
  price,
  onClose,
  onDone,
}: {
  registration: Registration | null;
  price: number | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation('calendar');
  return (
    <ResponsiveModal
      opened={registration !== null}
      onClose={onClose}
      title={t('registrations.paymentTitle')}
      size="md"
    >
      {registration && (
        <PaymentForm registration={registration} price={price} onClose={onClose} onDone={onDone} />
      )}
    </ResponsiveModal>
  );
}
