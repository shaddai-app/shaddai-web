import {
  Alert,
  Button,
  Center,
  Group,
  Loader,
  Radio,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { IconCalendarEvent, IconCircleCheck, IconClock, IconMapPin } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { publicEventsApi, type RegistrationStatus } from '../api/calendar';
import { FormError } from '../components/FormError';
import { PublicShell } from '../components/PublicShell';
import { Turnstile } from '../components/Turnstile';

// Página pública (sin sesión): inscripción a un evento desde el enlace que comparte la iglesia.
export const Route = createFileRoute('/inscripcion/$slug/$id')({
  component: PublicRegistrationPage,
});

const orNull = (v: string) => (v.trim() === '' ? null : v.trim());

function when(startsAt: string, endsAt: string, allDay: boolean) {
  const start = dayjs(startsAt);
  const sameDay = startsAt.slice(0, 10) === endsAt.slice(0, 10);
  const day = start.format('dddd LL');
  const capitalized = day.charAt(0).toUpperCase() + day.slice(1);
  if (allDay) return sameDay ? capitalized : `${capitalized} – ${dayjs(endsAt).format('LL')}`;
  return `${capitalized} · ${start.format('LT')} – ${dayjs(endsAt).format('LT')}`;
}

function PublicRegistrationPage() {
  const { slug, id } = Route.useParams();
  const { t, i18n } = useTranslation(['calendar', 'errors', 'common']);
  const page = useQuery({
    queryKey: ['public-event', slug, id],
    queryFn: () => publicEventsApi.event(slug, Number(id)),
    retry: false,
  });
  const [occurrence, setOccurrence] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [website, setWebsite] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState<RegistrationStatus | null>(null);

  if (page.isPending) {
    return (
      <Center mih="100dvh">
        <Loader />
      </Center>
    );
  }
  if (page.isError) {
    return (
      <PublicShell>
        <Text ta="center">{t('public.notFound')}</Text>
      </PublicShell>
    );
  }
  const { church, event, turnstileSiteKey } = page.data;
  const money = (v: number) =>
    new Intl.NumberFormat(i18n.resolvedLanguage === 'es' ? 'es-AR' : i18n.resolvedLanguage, {
      style: 'currency',
      currency: church.currency,
    }).format(v);
  const open = event.dates.filter((d) => !d.full || d.waitlist);
  const chosen = event.dates.find(
    (d) => d.occurrence === (occurrence ?? (open.length === 1 ? open[0]!.occurrence : null)),
  );
  const valid = Boolean(
    chosen && name.trim().length >= 2 && (email.trim() || phone.trim()) && (!turnstileSiteKey || token),
  );

  if (done) {
    return (
      <PublicShell logo={church.logoUrl} name={church.name}>
        <Stack align="center" ta="center" gap="sm">
          <IconCircleCheck
            size={48}
            color={`var(--mantine-color-${done === 'waitlist' ? 'yellow' : 'teal'}-6)`}
          />
          <Title order={1} size="h3">
            {done === 'waitlist' ? t('public.waitlistTitle') : t('public.thanksTitle')}
          </Title>
          <Text c="dimmed">
            {done === 'waitlist' ? t('public.waitlistBody') : t('public.thanksBody', { event: event.title })}
          </Text>
          {chosen && <Text fw={500}>{when(chosen.startsAt, chosen.endsAt, event.allDay)}</Text>}
          {event.price !== null && event.price > 0 && (
            <Text size="sm" c="dimmed">
              {t('public.payAtChurch', { amount: money(event.price) })}
            </Text>
          )}
        </Stack>
      </PublicShell>
    );
  }

  return (
    <PublicShell logo={church.logoUrl} name={church.name}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valid || !chosen) return;
          setBusy(true);
          setError(null);
          try {
            const res = await publicEventsApi.register(slug, Number(id), {
              occurrence: chosen.occurrence,
              name: name.trim(),
              email: orNull(email),
              phone: orNull(phone),
              notes: orNull(notes),
              ...(token ? { turnstileToken: token } : {}),
              website,
            });
            setDone(res.status);
          } catch (err) {
            setError(err);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Stack gap="md">
          <div>
            <Title order={1} size="h2">
              {event.title}
            </Title>
            {event.location && (
              <Group gap={6} mt={4} wrap="nowrap">
                <IconMapPin size={16} />
                <Text size="sm">{event.location}</Text>
              </Group>
            )}
            {event.price !== null && event.price > 0 && (
              <Text size="sm" fw={600} mt={4}>
                {t('public.price', { amount: money(event.price) })}
              </Text>
            )}
          </div>
          {event.description && (
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
              {event.description}
            </Text>
          )}
          {open.length === 0 ? (
            <Alert color="gray" variant="light">
              {event.dates.length ? t('public.full') : t('public.noDates')}
            </Alert>
          ) : (
            <>
              {event.dates.length === 1 ? (
                <Group gap={6} wrap="nowrap">
                  {event.allDay ? <IconCalendarEvent size={18} /> : <IconClock size={18} />}
                  <Text fw={500}>{when(event.dates[0]!.startsAt, event.dates[0]!.endsAt, event.allDay)}</Text>
                </Group>
              ) : (
                <Radio.Group
                  label={t('public.chooseDate')}
                  value={chosen?.occurrence ?? null}
                  onChange={setOccurrence}
                  required
                >
                  <Stack gap={6} mt={6}>
                    {event.dates.map((d) => (
                      <Radio
                        key={d.occurrence}
                        value={d.occurrence}
                        disabled={d.full && !d.waitlist}
                        label={when(d.startsAt, d.endsAt, event.allDay)}
                        description={
                          d.full
                            ? d.waitlist
                              ? t('public.waitlistOnly')
                              : t('public.soldOut')
                            : d.available !== null
                              ? t('public.spots', { count: d.available })
                              : undefined
                        }
                      />
                    ))}
                  </Stack>
                </Radio.Group>
              )}
              {chosen?.full && chosen.waitlist && (
                <Alert color="yellow" variant="light" p="xs">
                  {t('public.waitlistNotice')}
                </Alert>
              )}
              <FormError error={error} />
              <TextInput
                label={t('registrations.name')}
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                maxLength={150}
                required
                autoComplete="name"
              />
              <TextInput
                type="email"
                label={t('registrations.email')}
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                maxLength={150}
                autoComplete="email"
              />
              <TextInput
                type="tel"
                label={t('registrations.phone')}
                value={phone}
                onChange={(e) => setPhone(e.currentTarget.value)}
                maxLength={30}
                autoComplete="tel"
              />
              <Text size="xs" c="dimmed" mt={-8}>
                {t('registrations.contactHint')}
              </Text>
              <Textarea
                label={t('public.notes')}
                value={notes}
                onChange={(e) => setNotes(e.currentTarget.value)}
                maxLength={500}
                autosize
                minRows={2}
              />
              {/* Trampa para bots: invisible y fuera del orden de tabulación. */}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden
                value={website}
                onChange={(e) => setWebsite(e.currentTarget.value)}
                style={{ position: 'absolute', left: -10000, width: 1, height: 1, opacity: 0 }}
              />
              {turnstileSiteKey && (
                <Turnstile
                  siteKey={turnstileSiteKey}
                  onToken={setToken}
                  language={i18n.resolvedLanguage ?? 'es'}
                />
              )}
              <Button type="submit" size="md" loading={busy} disabled={!valid}>
                {chosen?.full ? t('public.joinWaitlist') : t('public.submit')}
              </Button>
            </>
          )}
        </Stack>
      </form>
    </PublicShell>
  );
}
