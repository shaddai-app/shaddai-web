import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Checkbox,
  CloseButton,
  Group,
  NumberInput,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { useDebouncedCallback, useNetwork } from '@mantine/hooks';
import { IconCloudOff, IconSend, IconTrash, IconUserPlus } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { reportsApi, type CellDetail, type CellReport } from '../../api/cells';
import { ApiError } from '../../api/http';
import { FormError } from '../../components/FormError';
import { AnchorLink } from '../../components/links';
import { reportDrafts, notifyDraftsChanged, type Owner, type ReportDraft } from '../../pwa/report-drafts';
import { isNetworkError } from '../../pwa/snapshots';
import { fullName } from '../people/format';
import { PersonAvatar } from '../people/PersonBits';
import { PersonPicker } from '../people/PersonPicker';
import { useBreakdown } from './use-breakdown';
import { emptyReport, fromReport, missing, toInput, totals, type ReportFormState } from './report-form';

export type ReportResult = { report: CellReport } | { queued: true };

function currencySymbol(currency: string, locale: string) {
  try {
    return (
      new Intl.NumberFormat(locale, { style: 'currency', currency })
        .formatToParts(0)
        .find((p) => p.type === 'currency')?.value ?? currency
    );
  } catch {
    return currency;
  }
}

function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <Card withBorder radius="lg" padding="md">
      <Group justify="space-between" mb="sm" wrap="nowrap">
        <Title order={3} size="h5">
          {title}
        </Title>
        {right}
      </Group>
      {children}
    </Card>
  );
}

export function ReportForm({
  cell,
  owner,
  report,
  currency,
  onDone,
  onCancel,
}: {
  cell: CellDetail;
  owner: Owner;
  /** Corregir un reporte ya enviado (sin borrador offline). */
  report?: CellReport;
  currency: string;
  onDone: (result: ReportResult) => void;
  onCancel: () => void;
}) {
  const { t, i18n } = useTranslation(['cells', 'common']);
  const network = useNetwork();
  const breakdown = useBreakdown();
  const creating = !report;
  const [form, setForm] = useState<ReportFormState>(() =>
    report ? fromReport(report) : emptyReport(cell.today, cell.meetingDay),
  );
  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [existingId, setExistingId] = useState<number | null>(null);

  // Borrador previo de esta célula (solo al cargar uno nuevo).
  useEffect(() => {
    if (!creating) return;
    let alive = true;
    void reportDrafts.get(owner, cell.id).then((d) => {
      if (alive && d) {
        setDraft(d);
        setForm(d.form);
      }
    });
    return () => {
      alive = false;
    };
  }, [creating, owner, cell.id]);

  const saveDraft = useDebouncedCallback((state: ReportFormState) => {
    const next = {
      cellId: cell.id,
      cellName: cell.name,
      form: state,
      input: toInput(state),
      status: 'editing' as const,
    };
    void reportDrafts.save(owner, next);
    setDraft({ ...next, updatedAt: Date.now() });
  }, 400);

  const update = (patch: Partial<ReportFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  // Cada cambio del líder queda guardado en el celular (se retoma aunque se cierre la app).
  useEffect(() => {
    if (creating && dirty) saveDraft(form);
  }, [creating, dirty, form, saveDraft]);

  const members = cell.members;
  const present = useMemo(() => new Set(form.attendance), [form.attendance]);
  const sum = totals(form);
  const lacking = missing(form);
  // Con alcance propio la API solo acepta fechas dentro de la ventana de la cuenta.
  const minDate = dayjs(cell.today).subtract(cell.reportEditDays, 'day').format('YYYY-MM-DD');

  const discardDraft = async () => {
    await reportDrafts.remove(owner, cell.id);
    notifyDraftsChanged();
    setDraft(null);
    setDirty(false);
    setForm(emptyReport(cell.today, cell.meetingDay));
  };

  const submit = async () => {
    setError(null);
    setExistingId(null);
    setBusy(true);
    const input = toInput(form);
    try {
      const saved = report
        ? await reportsApi.update(report.id, input)
        : await reportsApi.create(cell.id, input);
      if (creating) {
        await reportDrafts.remove(owner, cell.id);
        notifyDraftsChanged();
      }
      onDone({ report: saved });
    } catch (err) {
      if (creating && isNetworkError(err)) {
        // Sin señal: queda en cola y OutboxSync lo manda cuando vuelva la conexión.
        await reportDrafts.save(owner, {
          cellId: cell.id,
          cellName: cell.name,
          form,
          input,
          status: 'queued',
        });
        notifyDraftsChanged();
        onDone({ queued: true });
        return;
      }
      if (err instanceof ApiError && err.code === 'REPORT_EXISTS') {
        setExistingId((err.details as { reportId?: number } | undefined)?.reportId ?? null);
      }
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const visitorIds = form.visitors.map((v) => v.id);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!lacking) void submit();
      }}
    >
      <Stack gap="md">
        {!network.online && (
          <Alert color="yellow" variant="light" icon={<IconCloudOff size={18} />}>
            {creating ? t('report.offlineHint') : t('report.offlineEdit')}
          </Alert>
        )}
        {creating && draft && !dirty && (
          <Alert
            color={draft.status === 'error' ? 'red' : 'blue'}
            variant="light"
            title={t(`report.draft.${draft.status}`)}
          >
            <Group justify="space-between" gap="xs">
              <Text size="sm">
                {t('report.draft.savedAt', { time: dayjs(draft.updatedAt).format('L LT') })}
              </Text>
              <Button size="compact-sm" variant="subtle" color="gray" onClick={() => void discardDraft()}>
                {t('report.draft.discard')}
              </Button>
            </Group>
          </Alert>
        )}
        <FormError error={error} />
        {existingId && (
          <AnchorLink
            to="/celulas/$id/reportes/$reportId"
            params={{ id: String(cell.id), reportId: String(existingId) }}
            size="sm"
          >
            {t('report.openExisting')}
          </AnchorLink>
        )}

        <Section title={t('report.meeting')}>
          <Stack gap="sm">
            <TextInput
              type="date"
              label={t('report.date')}
              value={form.meetingDate}
              min={minDate}
              max={cell.today}
              onChange={(e) => update({ meetingDate: e.currentTarget.value })}
              required
            />
            <SegmentedControl
              fullWidth
              value={form.held ? 'yes' : 'no'}
              onChange={(v) => update({ held: v === 'yes' })}
              data={[
                { value: 'yes', label: t('report.held') },
                { value: 'no', label: t('report.notHeld') },
              ]}
            />
            {!form.held && (
              <Textarea
                label={t('report.notHeldReason')}
                placeholder={t('report.notHeldReasonPlaceholder')}
                value={form.notHeldReason}
                onChange={(e) => update({ notHeldReason: e.currentTarget.value })}
                maxLength={300}
                autosize
                minRows={2}
                required
              />
            )}
          </Stack>
        </Section>

        {form.held && (
          <>
            <Section
              title={t('report.attendance', { count: form.attendance.length, total: members.length })}
              right={
                members.length > 0 && (
                  <Button
                    variant="subtle"
                    size="compact-sm"
                    onClick={() =>
                      update({ attendance: present.size === members.length ? [] : members.map((m) => m.id) })
                    }
                  >
                    {present.size === members.length ? t('report.none') : t('report.all')}
                  </Button>
                )
              }
            >
              {members.length === 0 ? (
                <Text size="sm" c="dimmed">
                  {t('members.empty')}
                </Text>
              ) : (
                <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs">
                  {members.map((m) => (
                    <Checkbox.Card
                      key={m.id}
                      radius="md"
                      p="sm"
                      checked={present.has(m.id)}
                      onClick={() =>
                        update({
                          attendance: present.has(m.id)
                            ? form.attendance.filter((id) => id !== m.id)
                            : [...form.attendance, m.id],
                        })
                      }
                    >
                      <Group wrap="nowrap" gap="sm">
                        <Checkbox.Indicator />
                        <PersonAvatar person={m} size={32} />
                        <Text size="sm" fw={500} truncate>
                          {fullName(m)}
                        </Text>
                      </Group>
                    </Checkbox.Card>
                  ))}
                </SimpleGrid>
              )}
            </Section>

            <Section title={t('report.visitors')}>
              <Stack gap="sm">
                <PersonPicker
                  label={t('report.knownVisitor')}
                  placeholder={t('form.searchPerson')}
                  value={null}
                  disabled={!network.online}
                  onChange={(p) =>
                    p &&
                    update({
                      visitors: [
                        ...form.visitors,
                        { id: p.id, firstName: p.firstName, lastName: p.lastName, phone: p.phone },
                      ],
                    })
                  }
                  exclude={[...members.map((m) => m.id), ...visitorIds]}
                />
                {form.visitors.map((v) => (
                  <Group key={v.id} justify="space-between" wrap="nowrap">
                    <Text size="sm">{fullName(v)}</Text>
                    <CloseButton
                      aria-label={t('report.removeVisitor')}
                      onClick={() => update({ visitors: form.visitors.filter((x) => x.id !== v.id) })}
                    />
                  </Group>
                ))}

                {form.newVisitors.map((v, i) => (
                  <Paper key={i} withBorder radius="md" p="sm">
                    <Group justify="space-between" mb={4}>
                      <Text size="xs" c="dimmed">
                        {t('report.newVisitor', { n: i + 1 })}
                      </Text>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        aria-label={t('report.removeVisitor')}
                        onClick={() => update({ newVisitors: form.newVisitors.filter((_, j) => j !== i) })}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Group>
                    <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs">
                      {(['firstName', 'lastName', 'phone'] as const).map((field) => (
                        <TextInput
                          key={field}
                          aria-label={t(`report.visitorFields.${field}`)}
                          placeholder={t(`report.visitorFields.${field}`)}
                          type={field === 'phone' ? 'tel' : 'text'}
                          value={v[field]}
                          maxLength={field === 'phone' ? 30 : 80}
                          onChange={(e) => {
                            const value = e.currentTarget.value;
                            update({
                              newVisitors: form.newVisitors.map((x, j) =>
                                j === i ? { ...x, [field]: value } : x,
                              ),
                            });
                          }}
                        />
                      ))}
                    </SimpleGrid>
                  </Paper>
                ))}
                <Button
                  variant="light"
                  leftSection={<IconUserPlus size={16} />}
                  onClick={() =>
                    update({ newVisitors: [...form.newVisitors, { firstName: '', lastName: '', phone: '' }] })
                  }
                  disabled={form.newVisitors.length >= 30}
                >
                  {t('report.addNewVisitor')}
                </Button>
                <Text size="xs" c="dimmed">
                  {t('report.newVisitorHint')}
                </Text>
                <SimpleGrid cols={2} spacing="sm">
                  <NumberInput
                    label={t('report.anonymousVisitors')}
                    value={form.anonymousVisitors}
                    onChange={(v) => update({ anonymousVisitors: Math.max(0, Number(v) || 0) })}
                    min={0}
                    max={500}
                    allowDecimal={false}
                    allowNegative={false}
                  />
                  <NumberInput
                    label={t('report.children')}
                    value={form.childrenCount}
                    onChange={(v) => update({ childrenCount: Math.max(0, Number(v) || 0) })}
                    min={0}
                    max={500}
                    allowDecimal={false}
                    allowNegative={false}
                  />
                </SimpleGrid>
              </Stack>
            </Section>

            <Section title={t('report.details')}>
              <Stack gap="sm">
                <TextInput
                  label={t('report.topic')}
                  value={form.topic}
                  onChange={(e) => update({ topic: e.currentTarget.value })}
                  maxLength={200}
                />
                <NumberInput
                  label={t('report.offering')}
                  description={
                    report?.offeringStatus === 'confirmed'
                      ? t('report.offeringConfirmed')
                      : report?.offeringStatus === 'rejected'
                        ? t('report.offeringRejected')
                        : t('report.offeringHint')
                  }
                  // Confirmada por tesorería: el monto ya no se cambia (la API lo rechaza).
                  disabled={report?.offeringStatus === 'confirmed'}
                  prefix={`${currencySymbol(currency, i18n.resolvedLanguage ?? 'es')} `}
                  value={form.offering === '' ? '' : Number(form.offering)}
                  onChange={(v) => update({ offering: v === '' ? '' : String(v) })}
                  min={0}
                  decimalScale={2}
                  allowNegative={false}
                  inputMode="decimal"
                />
              </Stack>
            </Section>
          </>
        )}

        <Textarea
          label={t('report.notes')}
          value={form.notes}
          onChange={(e) => update({ notes: e.currentTarget.value })}
          maxLength={1000}
          autosize
          minRows={2}
        />

        {/* Barra fija: total y enviar siempre a mano con el pulgar (encima de la barra inferior). */}
        <Paper
          withBorder
          radius="lg"
          p="sm"
          shadow="sm"
          style={{ position: 'sticky', bottom: 'calc(var(--app-shell-footer-offset, 0px) + 8px)', zIndex: 5 }}
        >
          <Group justify="space-between" wrap="nowrap" gap="sm">
            <div style={{ minWidth: 0 }}>
              <Text size="sm" fw={600}>
                {form.held ? t('report.total', { count: sum.total }) : t('report.notHeld')}
              </Text>
              {form.held && (
                <Text size="xs" c="dimmed" truncate>
                  {breakdown(sum)}
                </Text>
              )}
            </div>
            <Group gap="xs" wrap="nowrap">
              <Button variant="default" onClick={onCancel} visibleFrom="xs">
                {t('common:actions.cancel')}
              </Button>
              <Button
                type="submit"
                loading={busy}
                disabled={Boolean(lacking)}
                leftSection={creating ? <IconSend size={16} /> : undefined}
              >
                {creating ? t('report.send') : t('common:actions.save')}
              </Button>
            </Group>
          </Group>
        </Paper>
      </Stack>
    </form>
  );
}
