import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconBan, IconCheck, IconDeviceFloppy, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useBlocker, useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  financeApi,
  PAYMENT_METHODS,
  type CountLine,
  type OfferingCountDetail,
  type PaymentMethod,
} from '../../../../../api/finance';
import { requirePermission } from '../../../../../auth/guards';
import { can } from '../../../../../auth/permissions';
import { meQuery } from '../../../../../auth/session';
import { FormError } from '../../../../../components/FormError';
import { AnchorLink } from '../../../../../components/links';
import {
  categoriesQuery,
  COUNT_STATUS_COLORS,
  useCategoryLabel,
  useMoney,
  useClosedUntil,
} from '../../../../../features/finance/common';
import { CountHeaderModal } from '../../../../../features/finance/CountHeaderModal';
import {
  denominationsFor,
  draftFromDetail,
  draftTotals,
  incompleteRows,
  linesFromDraft,
  rowKey,
  type CountDraft,
} from '../../../../../features/finance/counts';
import { useSeparators } from '../../../../../features/finance/money-input';
import { MovementLine } from '../../../../../features/finance/MovementLine';
import { VoidModal } from '../../../../../features/finance/MovementModals';
import { formatDate, fullName } from '../../../../../features/people/format';
import { PersonPicker } from '../../../../../features/people/PersonPicker';
import { errorMessage } from '../../../../../i18n/errors';
import { PageHeader } from '../../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/finanzas/arqueos/$id')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'finanzas.ver', 'finanzas.arqueo'),
  component: CountPage,
});

const countKey = (id: number) => ['finance', 'count', id];
const tabular = { fontVariantNumeric: 'tabular-nums' } as const;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="sm" component="div">
        {children}
      </Text>
    </div>
  );
}

/** Datos generales (fecha, caja, contadores). */
function HeaderCard({ count, onEdit }: { count: OfferingCountDetail; onEdit?: () => void }) {
  const { t } = useTranslation('finance');
  return (
    <Card withBorder radius="lg">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" style={{ flex: 1 }}>
          <Field label={t('movement.date')}>{formatDate(count.date)}</Field>
          <Field label={t('movement.account')}>{count.financeAccount.name}</Field>
          <Field label={t('counts.counter1')}>{fullName(count.counter1)}</Field>
          <Field label={t('counts.counter2')}>{fullName(count.counter2)}</Field>
        </SimpleGrid>
        {onEdit && (
          <ActionIcon variant="subtle" aria-label={t('counts.editHeader')} onClick={onEdit}>
            <IconPencil size={18} />
          </ActionIcon>
        )}
      </Group>
      {count.notes && (
        <Text size="sm" mt="sm" style={{ whiteSpace: 'pre-wrap' }}>
          {count.notes}
        </Text>
      )}
    </Card>
  );
}

/** Total y subtotales por medio de pago. */
function TotalsCard({
  total,
  byMethod,
  currency,
  compact = false,
  children,
}: {
  total: number;
  byMethod: { method: PaymentMethod; amount: number }[];
  currency: string;
  /** Versión baja para la barra fija del editor (deja ver más renglones). */
  compact?: boolean;
  children?: ReactNode;
}) {
  const { t } = useTranslation('finance');
  const money = useMoney();
  return (
    <Card withBorder radius="lg" padding={compact ? 'sm' : 'md'} shadow={compact ? 'md' : undefined}>
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
        <div>
          <Text size="xs" c="dimmed">
            {t('counts.total')}
          </Text>
          <Text fw={700} size={compact ? '1.35rem' : '1.75rem'} style={tabular}>
            {money(total, currency)}
          </Text>
          <Group gap="md" mt={compact ? 0 : 4}>
            {byMethod.map((m) => (
              <Text key={m.method} size="xs" c="dimmed" style={tabular}>
                {t(`methods.${m.method}`)}: {money(m.amount, currency)}
              </Text>
            ))}
          </Group>
        </div>
        {children}
      </Group>
    </Card>
  );
}

/** Renglones de un arqueo ya guardado (solo lectura). */
function LinesList({ lines, currency }: { lines: CountLine[]; currency: string }) {
  const { t } = useTranslation('finance');
  const money = useMoney();
  const categoryLabel = useCategoryLabel();
  return (
    <Card withBorder radius="lg" p={0}>
      <Title order={3} size="h5" p="md" pb="xs">
        {t('counts.detail')}
      </Title>
      {lines.length === 0 ? (
        <Text size="sm" c="dimmed" px="md" pb="md">
          {t('counts.noLines')}
        </Text>
      ) : (
        lines.map((l) => (
          <Group
            key={l.id}
            justify="space-between"
            wrap="nowrap"
            px="md"
            py={8}
            style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
          >
            <div style={{ minWidth: 0 }}>
              <Text size="sm" truncate>
                {l.denomination !== null
                  ? `${money(l.denomination, currency, { whole: true })} × ${l.quantity}`
                  : l.nominal
                    ? l.person
                      ? t('counts.envelopeOf', { name: fullName(l.person) })
                      : t('counts.envelopeHidden')
                    : t(`methods.${l.paymentMethod}`)}
              </Text>
              <Text size="xs" c="dimmed" truncate>
                {[categoryLabel(l.category), l.nominal && t(`methods.${l.paymentMethod}`)]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </div>
            <Text size="sm" fw={500} style={tabular}>
              {money(l.amount, currency)}
            </Text>
          </Group>
        ))
      )}
    </Card>
  );
}

function CountEditor({
  count,
  onSaved,
}: {
  count: OfferingCountDetail;
  onSaved: (c: OfferingCountDetail) => void;
}) {
  const { t } = useTranslation(['finance', 'common']);
  const navigate = useNavigate();
  const money = useMoney();
  const separators = useSeparators();
  const categoryLabel = useCategoryLabel();
  const { data: me } = useSuspenseQuery(meQuery());
  const categories = useQuery(categoriesQuery('income'));
  const idOf = (key: string) => categories.data?.find((c) => c.systemKey === key)?.id ?? null;
  const [draft, setDraft] = useState<CountDraft>(() => draftFromDetail(count, null));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [editingHeader, setEditingHeader] = useState(false);
  const currency = count.financeAccount.currency;
  const canContributors = can(me, 'finanzas.diezmos_nominales');
  // Sin ver los nombres de los sobres no se pueden reemplazar los renglones (la API lo rechaza).
  const linesLocked = !canContributors && count.lines.some((l) => l.nominal);
  const effective = { ...draft, cashCategoryId: draft.cashCategoryId ?? idOf('offering') };
  const totals = draftTotals(effective);
  const incomplete = incompleteRows(effective);
  const denominations = denominationsFor(currency, Object.keys(draft.bills).map(Number));
  const categoryOptions = (categories.data ?? []).map((c) => ({
    value: String(c.id),
    label: categoryLabel(c),
  }));
  const methodOptions = PAYMENT_METHODS.map((m) => ({ value: m, label: t(`methods.${m}`) }));

  useBlocker({
    shouldBlockFn: () => dirty && !window.confirm(t('common:unsavedChanges')),
    enableBeforeUnload: () => dirty,
  });

  const edit = (fn: (d: CountDraft) => CountDraft) => {
    setDraft(fn);
    setDirty(true);
  };
  const save = async () => {
    const saved = await financeApi.updateCount(count.id, { lines: linesFromDraft(effective) });
    setDirty(false);
    return saved;
  };
  const run = async (fn: () => Promise<OfferingCountDetail>, message: string) => {
    setBusy(true);
    setError(null);
    try {
      const saved = await fn();
      setDraft(draftFromDetail(saved, null));
      setDirty(false);
      onSaved(saved);
      notifications.show({ color: 'teal', message });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  const confirm = () =>
    modals.openConfirmModal({
      title: t('counts.confirmTitle'),
      children: (
        <Text size="sm">
          {t('counts.confirmBody', {
            amount: money(totals.total, currency),
            account: count.financeAccount.name,
            counter1: fullName(count.counter1),
            counter2: fullName(count.counter2),
          })}
        </Text>
      ),
      labels: { confirm: t('counts.confirm'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'teal' },
      onConfirm: () =>
        void run(async () => {
          if (dirty && !linesLocked) await save();
          return financeApi.confirmCount(count.id);
        }, t('counts.confirmed')),
    });
  const remove = () =>
    modals.openConfirmModal({
      title: t('counts.deleteTitle'),
      children: <Text size="sm">{t('counts.deleteBody')}</Text>,
      labels: { confirm: t('counts.delete'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await financeApi.deleteCount(count.id);
          setDirty(false);
          // Recién borrado: no hay nada que perder, se sale sin preguntar.
          void navigate({ to: '/finanzas/arqueos', ignoreBlocker: true });
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  return (
    <>
      <PageHeader
        back={{ to: '/finanzas/arqueos' }}
        title={count.title ?? t('counts.untitled', { date: formatDate(count.date) })}
        badge={
          <Badge color={COUNT_STATUS_COLORS.draft} variant="light">
            {t('counts.status.draft')}
          </Badge>
        }
        actions={
          <Button variant="default" color="red" leftSection={<IconTrash size={18} />} onClick={remove}>
            {t('counts.delete')}
          </Button>
        }
      />
      <Stack gap="md">
        <HeaderCard count={count} onEdit={() => setEditingHeader(true)} />
        <FormError error={error} />

        {linesLocked ? (
          <>
            <Alert color="gray" variant="light">
              {t('counts.lockedLines')}
            </Alert>
            <LinesList lines={count.lines} currency={currency} />
          </>
        ) : (
          <>
            <Card withBorder radius="lg">
              <Group justify="space-between" mb="sm" wrap="wrap" gap="xs">
                <div>
                  <Title order={3} size="h5">
                    {t('counts.bills')}
                  </Title>
                  <Text size="xs" c="dimmed">
                    {t('counts.billsHint')}
                  </Text>
                </div>
                <Select
                  aria-label={t('movement.category')}
                  size="xs"
                  w={170}
                  data={categoryOptions}
                  value={effective.cashCategoryId ? String(effective.cashCategoryId) : null}
                  onChange={(v) => v && edit((d) => ({ ...d, cashCategoryId: Number(v) }))}
                  allowDeselect={false}
                />
              </Group>
              <Stack gap={6}>
                {denominations.map((value) => {
                  const quantity = draft.bills[String(value)] ?? '';
                  return (
                    <Group key={value} gap="xs" wrap="nowrap">
                      <Text size="sm" w={96} ta="right" style={tabular}>
                        {money(value, currency, { whole: true })}
                      </Text>
                      <Text size="sm" c="dimmed">
                        ×
                      </Text>
                      <NumberInput
                        aria-label={t('counts.quantityOf', { value: money(value, currency) })}
                        w={84}
                        size="sm"
                        value={quantity}
                        min={0}
                        max={1_000_000}
                        allowDecimal={false}
                        allowNegative={false}
                        hideControls
                        inputMode="numeric"
                        onChange={(v) =>
                          edit((d) => ({
                            ...d,
                            bills: { ...d.bills, [String(value)]: v === '' ? '' : Number(v) },
                          }))
                        }
                      />
                      <Text
                        size="sm"
                        c={quantity ? undefined : 'dimmed'}
                        ta="right"
                        style={{ ...tabular, flex: 1 }}
                      >
                        {money(value * (Number(quantity) || 0), currency, { whole: true })}
                      </Text>
                    </Group>
                  );
                })}
              </Stack>
              <Divider my="sm" />
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  {t('counts.billsTotal')}
                </Text>
                <Text fw={600} style={tabular}>
                  {money(totals.bills, currency)}
                </Text>
              </Group>
            </Card>

            <Card withBorder radius="lg">
              <Title order={3} size="h5">
                {t('counts.others')}
              </Title>
              <Text size="xs" c="dimmed" mb="sm">
                {t('counts.othersHint')}
              </Text>
              <Stack gap="sm">
                {draft.others.map((row, i) => (
                  <Group key={row.key} gap="xs" align="flex-end" wrap="wrap">
                    <Select
                      aria-label={t('movement.method')}
                      data={methodOptions}
                      value={row.paymentMethod}
                      onChange={(v) =>
                        v &&
                        edit((d) => ({
                          ...d,
                          others: d.others.map((o, k) =>
                            k === i ? { ...o, paymentMethod: v as PaymentMethod } : o,
                          ),
                        }))
                      }
                      allowDeselect={false}
                      w={{ base: 'calc(50% - 6px)', xs: 150 }}
                    />
                    <Select
                      aria-label={t('movement.category')}
                      placeholder={t('movement.category')}
                      data={categoryOptions}
                      value={row.categoryId ? String(row.categoryId) : null}
                      onChange={(v) =>
                        edit((d) => ({
                          ...d,
                          others: d.others.map((o, k) =>
                            k === i ? { ...o, categoryId: v ? Number(v) : null } : o,
                          ),
                        }))
                      }
                      error={Boolean(row.amount) && !row.categoryId}
                      w={{ base: 'calc(50% - 6px)', xs: 180 }}
                    />
                    <NumberInput
                      aria-label={t('movement.amount')}
                      placeholder={t('movement.amount')}
                      value={row.amount}
                      onChange={(v) =>
                        edit((d) => ({
                          ...d,
                          others: d.others.map((o, k) =>
                            k === i ? { ...o, amount: v === '' ? '' : Number(v) } : o,
                          ),
                        }))
                      }
                      decimalScale={2}
                      allowNegative={false}
                      hideControls
                      inputMode="decimal"
                      style={{ flex: 1, minWidth: 96 }}
                      {...separators}
                    />
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="lg"
                      aria-label={t('counts.removeRow')}
                      onClick={() => edit((d) => ({ ...d, others: d.others.filter((_, k) => k !== i) }))}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                ))}
                <Button
                  variant="light"
                  size="compact-sm"
                  leftSection={<IconPlus size={14} />}
                  style={{ alignSelf: 'flex-start' }}
                  onClick={() =>
                    edit((d) => ({
                      ...d,
                      others: [
                        ...d.others,
                        {
                          key: rowKey(),
                          categoryId: idOf('offering'),
                          paymentMethod: 'transfer',
                          amount: '',
                        },
                      ],
                    }))
                  }
                >
                  {t('counts.addOther')}
                </Button>
              </Stack>
            </Card>

            {canContributors && (
              <Card withBorder radius="lg">
                <Title order={3} size="h5">
                  {t('counts.envelopes')}
                </Title>
                <Text size="xs" c="dimmed" mb="sm">
                  {t('counts.envelopesHint')}
                </Text>
                <Stack gap="sm">
                  {draft.envelopes.map((row, i) => {
                    const set = (patch: Partial<typeof row>) =>
                      edit((d) => ({
                        ...d,
                        envelopes: d.envelopes.map((e, k) => (k === i ? { ...e, ...patch } : e)),
                      }));
                    return (
                      <Card key={row.key} withBorder radius="md" p="xs">
                        <Group gap="xs" align="flex-end" wrap="wrap">
                          <PersonPicker
                            aria-label={t('movement.contributor')}
                            placeholder={t('movement.contributor')}
                            value={row.person}
                            onChange={(p) => set({ person: p })}
                            error={Boolean(row.amount) && !row.person}
                            style={{ flex: '1 1 220px' }}
                          />
                          <NumberInput
                            aria-label={t('movement.amount')}
                            placeholder={t('movement.amount')}
                            value={row.amount}
                            onChange={(v) => set({ amount: v === '' ? '' : Number(v) })}
                            decimalScale={2}
                            allowNegative={false}
                            hideControls
                            inputMode="decimal"
                            style={{ flex: '1 1 120px' }}
                            {...separators}
                          />
                        </Group>
                        <Group gap="xs" mt="xs" wrap="nowrap">
                          <Select
                            aria-label={t('movement.category')}
                            size="xs"
                            data={categoryOptions}
                            value={row.categoryId ? String(row.categoryId) : null}
                            onChange={(v) => set({ categoryId: v ? Number(v) : null })}
                            style={{ flex: 1 }}
                          />
                          <Select
                            aria-label={t('movement.method')}
                            size="xs"
                            data={methodOptions}
                            value={row.paymentMethod}
                            onChange={(v) => v && set({ paymentMethod: v as PaymentMethod })}
                            allowDeselect={false}
                            style={{ flex: 1 }}
                          />
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            aria-label={t('counts.removeRow')}
                            onClick={() =>
                              edit((d) => ({ ...d, envelopes: d.envelopes.filter((_, k) => k !== i) }))
                            }
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Card>
                    );
                  })}
                  <Button
                    variant="light"
                    size="compact-sm"
                    leftSection={<IconPlus size={14} />}
                    style={{ alignSelf: 'flex-start' }}
                    onClick={() =>
                      edit((d) => ({
                        ...d,
                        envelopes: [
                          ...d.envelopes,
                          {
                            key: rowKey(),
                            person: null,
                            categoryId: idOf('tithe'),
                            paymentMethod: 'cash',
                            amount: '',
                          },
                        ],
                      }))
                    }
                  >
                    {t('counts.addEnvelope')}
                  </Button>
                </Stack>
              </Card>
            )}
          </>
        )}

        <div
          style={{ position: 'sticky', bottom: 'calc(var(--app-shell-footer-offset, 0px) + 8px)', zIndex: 5 }}
        >
          <TotalsCard total={totals.total} byMethod={totals.byMethod} currency={currency} compact>
            <Stack gap={6} style={{ flex: '1 1 240px', maxWidth: 360 }}>
              {incomplete > 0 && (
                <Text size="xs" c="orange">
                  {t('counts.incomplete', { count: incomplete })}
                </Text>
              )}
              <Group gap="xs" wrap="nowrap" grow>
                {!linesLocked && (
                  <Button
                    variant="default"
                    leftSection={<IconDeviceFloppy size={16} />}
                    disabled={!dirty}
                    loading={busy}
                    onClick={() => void run(save, t('counts.saved'))}
                  >
                    {t('common:actions.save')}
                  </Button>
                )}
                <Button
                  color="teal"
                  leftSection={<IconCheck size={16} />}
                  disabled={totals.total <= 0 || busy}
                  onClick={confirm}
                >
                  {t('counts.confirmShort')}
                </Button>
              </Group>
            </Stack>
          </TotalsCard>
        </div>
      </Stack>
      <CountHeaderModal
        opened={editingHeader}
        count={count}
        onClose={() => setEditingHeader(false)}
        onSaved={(saved) => {
          setEditingHeader(false);
          // Los datos generales se guardan aparte: el editor no se remonta y conserva lo no guardado.
          onSaved(saved);
          notifications.show({ color: 'teal', message: t('common:saved') });
        }}
      />
    </>
  );
}

function CountView({
  count,
  onSaved,
}: {
  count: OfferingCountDetail;
  onSaved: (c: OfferingCountDetail) => void;
}) {
  const { t } = useTranslation(['finance', 'common']);
  const { data: me } = useSuspenseQuery(meQuery());
  const [voiding, setVoiding] = useState(false);
  const voided = count.status === 'voided';
  const currency = count.financeAccount.currency;
  const closedUntil = useClosedUntil();
  const locked = Boolean(closedUntil && count.date <= closedUntil);
  return (
    <>
      <PageHeader
        back={{ to: '/finanzas/arqueos' }}
        title={count.title ?? t('counts.untitled', { date: formatDate(count.date) })}
        badge={
          <Badge color={COUNT_STATUS_COLORS[count.status]} variant="light">
            {t(`counts.status.${count.status}`)}
          </Badge>
        }
        actions={
          count.status === 'confirmed' &&
          !locked &&
          can(me, 'finanzas.anular') && (
            <Button
              variant="default"
              color="red"
              leftSection={<IconBan size={18} />}
              onClick={() => setVoiding(true)}
            >
              {t('counts.void')}
            </Button>
          )
        }
      />
      <Stack gap="md">
        {voided && (
          <Alert color="gray" variant="light" title={t('counts.voidedTitle')}>
            {count.voidReason}
            {count.voidedAt && (
              <Text size="xs" c="dimmed" mt={4}>
                {dayjs(count.voidedAt).format('L LT')}
              </Text>
            )}
          </Alert>
        )}
        <HeaderCard count={count} />
        <TotalsCard
          total={count.total}
          byMethod={count.byPaymentMethod.map((m) => ({ method: m.paymentMethod, amount: m.amount }))}
          currency={currency}
        />
        <LinesList lines={count.lines} currency={currency} />
        <Card withBorder radius="lg" p={0}>
          <Group justify="space-between" p="md" pb="xs">
            <Title order={3} size="h5">
              {t('counts.movements')}
            </Title>
            <AnchorLink
              to="/finanzas/movimientos"
              search={{ financeAccountId: count.financeAccount.id, from: count.date, to: count.date }}
              size="sm"
            >
              {count.financeAccount.name}
            </AnchorLink>
          </Group>
          {count.movements.map((m) => (
            <MovementLine key={m.id} m={m} showAccount={false} />
          ))}
        </Card>
        {count.confirmedAt && (
          <Text size="xs" c="dimmed">
            {t('counts.confirmedBy', {
              name: count.confirmedBy ? fullName(count.confirmedBy) : '—',
              date: dayjs(count.confirmedAt).format('L LT'),
            })}
          </Text>
        )}
      </Stack>
      <VoidModal
        opened={voiding}
        onClose={() => setVoiding(false)}
        labels={{ title: t('counts.voidTitle'), body: t('counts.voidBody'), confirm: t('counts.void') }}
        onConfirm={async (reason) => {
          try {
            onSaved(await financeApi.voidCount(count.id, reason));
            setVoiding(false);
            notifications.show({ message: t('counts.voidedDone') });
          } catch (err) {
            notifications.show({ color: 'red', message: errorMessage(err) });
          }
        }}
      />
    </>
  );
}

function CountPage() {
  const id = Number(Route.useParams().id);
  const queryClient = useQueryClient();
  const { data: me } = useSuspenseQuery(meQuery());
  const query = useQuery({ queryKey: countKey(id), queryFn: () => financeApi.count(id) });
  if (query.isPending) return <Loader />;
  if (query.isError) return <FormError error={query.error} />;
  const onSaved = (c: OfferingCountDetail) => {
    queryClient.setQueryData(countKey(id), c);
    void queryClient.invalidateQueries({
      queryKey: ['finance'],
      predicate: (q) => q.queryKey[1] !== 'count',
    });
  };
  const count = query.data;
  return count.status === 'draft' && can(me, 'finanzas.arqueo') ? (
    <CountEditor count={count} onSaved={onSaved} />
  ) : (
    <CountView count={count} onSaved={onSaved} />
  );
}
