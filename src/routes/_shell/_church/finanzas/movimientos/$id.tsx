import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  FileButton,
  Group,
  Image,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconBan,
  IconCheck,
  IconFileTypePdf,
  IconPaperclip,
  IconPencil,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { financeApi, type MovementDetail } from '../../../../../api/finance';
import { requirePermission } from '../../../../../auth/guards';
import { can } from '../../../../../auth/permissions';
import { meQuery } from '../../../../../auth/session';
import { FormError } from '../../../../../components/FormError';
import { AnchorLink } from '../../../../../components/links';
import { useFileUrl } from '../../../../../components/use-file-url';
import {
  kindColor,
  signedAmount,
  STATUS_COLORS,
  useCategoryLabel,
  useChurchCurrency,
  useMoney,
} from '../../../../../features/finance/common';
import { MovementModal, VoidModal } from '../../../../../features/finance/MovementModals';
import { ConfirmPendingModal } from '../../../../../features/finance/PendingModals';
import { formatDate, fullName } from '../../../../../features/people/format';
import { errorMessage } from '../../../../../i18n/errors';
import { PageHeader } from '../../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/finanzas/movimientos/$id')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'finanzas.ver'),
  component: MovementPage,
});

const movementKey = (id: number) => ['finance', 'movement', id];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <div>{children ?? '—'}</div>
    </div>
  );
}

function Attachment({
  file,
  canRemove,
  onRemove,
}: {
  file: MovementDetail['attachments'][number];
  canRemove: boolean;
  onRemove: () => void;
}) {
  const { t } = useTranslation('finance');
  const url = useFileUrl(file.id);
  const isPdf = file.mimeType === 'application/pdf';
  return (
    <Card withBorder radius="md" p="xs">
      <Stack gap={6}>
        {isPdf ? (
          <Group justify="center" h={96}>
            <IconFileTypePdf size={40} stroke={1.3} />
          </Group>
        ) : url ? (
          <Image src={url} h={96} fit="cover" radius="sm" alt={file.originalName} />
        ) : (
          <Loader size="sm" m="auto" />
        )}
        <Group justify="space-between" wrap="nowrap" gap={4}>
          {url ? (
            <Anchor href={url} target="_blank" rel="noopener noreferrer" size="xs" truncate>
              {file.originalName}
            </Anchor>
          ) : (
            <Text size="xs" truncate>
              {file.originalName}
            </Text>
          )}
          {canRemove && (
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              aria-label={t('receipts.remove')}
              onClick={onRemove}
            >
              <IconTrash size={14} />
            </ActionIcon>
          )}
        </Group>
      </Stack>
    </Card>
  );
}

function MovementPage() {
  const { t } = useTranslation(['finance', 'common']);
  const id = Number(Route.useParams().id);
  const queryClient = useQueryClient();
  const money = useMoney();
  const categoryLabel = useCategoryLabel();
  const { data: me } = useSuspenseQuery(meQuery());
  const query = useQuery({ queryKey: movementKey(id), queryFn: () => financeApi.movement(id) });
  const [editing, setEditing] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const churchCurrency = useChurchCurrency();

  const update = (m: MovementDetail) => {
    queryClient.setQueryData(movementKey(id), m);
    void queryClient.invalidateQueries({
      queryKey: ['finance'],
      predicate: (q) => q.queryKey[1] !== 'movement',
    });
  };
  const act = async (fn: () => Promise<MovementDetail>, message?: string) => {
    try {
      update(await fn());
      if (message) notifications.show({ color: 'teal', message });
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    }
  };

  if (query.isPending) return <Loader />;
  if (query.isError) return <FormError error={query.error} />;
  const m = query.data;
  const transfer = m.kind === 'transfer_in' || m.kind === 'transfer_out';
  const voided = m.status === 'voided' || m.status === 'rejected';
  const pending = m.status === 'pending';
  const currency = m.financeAccount?.currency ?? churchCurrency;
  const canRegister = can(me, 'finanzas.registrar') && !voided;
  // Los pendientes se confirman o rechazan; los de un arqueo se anulan con el arqueo.
  const own = m.status === 'confirmed' && !m.offeringCount;
  const canEdit = canRegister && own && !transfer;
  const canVoid = can(me, 'finanzas.anular') && own;
  const canResolve = pending && can(me, 'finanzas.confirmar_pendientes');

  const removeAttachment = (fileId: number) =>
    modals.openConfirmModal({
      title: t('receipts.removeTitle'),
      labels: { confirm: t('receipts.remove'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await financeApi.detach(m.id, fileId);
          await queryClient.invalidateQueries({ queryKey: movementKey(id) });
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  return (
    <>
      <PageHeader
        title={transfer ? t(`kinds.${m.kind}`) : categoryLabel(m.category)}
        badge={
          m.status !== 'confirmed' ? (
            <Badge color={STATUS_COLORS[m.status]} variant="light">
              {t(`status.${m.status}`)}
            </Badge>
          ) : (
            <Badge color={kindColor(m.kind)} variant="light">
              {t(`kinds.${m.kind}`)}
            </Badge>
          )
        }
        actions={
          (canEdit || canVoid) && (
            <Group gap="xs">
              {canEdit && (
                <Button leftSection={<IconPencil size={18} />} onClick={() => setEditing(true)}>
                  {t('movement.edit')}
                </Button>
              )}
              {canVoid && (
                <Button
                  variant="default"
                  color="red"
                  leftSection={<IconBan size={18} />}
                  onClick={() => setVoiding(true)}
                >
                  {t('void.open')}
                </Button>
              )}
            </Group>
          )
        }
      />
      <Stack gap="md" maw={820}>
        {pending && (
          <Alert color="yellow" variant="light">
            <Text size="sm">{t('pending.pendingHint')}</Text>
            {canResolve && (
              <Group gap="xs" mt="sm">
                <Button
                  color="teal"
                  size="xs"
                  leftSection={<IconCheck size={14} />}
                  onClick={() => setConfirming(true)}
                >
                  {t('pending.confirm')}
                </Button>
                <Button
                  variant="default"
                  size="xs"
                  leftSection={<IconX size={14} />}
                  onClick={() => setRejecting(true)}
                >
                  {t('pending.reject')}
                </Button>
              </Group>
            )}
          </Alert>
        )}
        {voided && (
          <Alert
            color="gray"
            variant="light"
            title={m.status === 'rejected' ? t('pending.rejectedTitle') : t('void.voidedTitle')}
          >
            {m.voidReason}
            {m.voidedAt && (
              <Text size="xs" c="dimmed" mt={4}>
                {dayjs(m.voidedAt).format('L LT')}
              </Text>
            )}
          </Alert>
        )}
        <Card withBorder radius="lg">
          <Text
            fw={700}
            size="2rem"
            c={voided || pending ? 'dimmed' : kindColor(m.kind)}
            td={voided ? 'line-through' : undefined}
            mb="md"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {money(signedAmount(m.kind, m.amount), currency, { signed: true })}
          </Text>
          <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
            <Field label={t('movement.date')}>
              <Text size="sm">{formatDate(m.date)}</Text>
            </Field>
            <Field label={t('movement.account')}>
              {m.financeAccount && (
                <AnchorLink
                  to="/finanzas/movimientos"
                  search={{ financeAccountId: m.financeAccount.id }}
                  size="sm"
                >
                  {m.financeAccount.name}
                </AnchorLink>
              )}
            </Field>
            {m.cellReport && (
              <Field label={t('movement.origin')}>
                <AnchorLink
                  to="/celulas/$id/reportes/$reportId"
                  params={{ id: String(m.cellReport.cell.id), reportId: String(m.cellReport.id) }}
                  size="sm"
                >
                  {t('pending.fromCell', { cell: m.cellReport.cell.name })}
                </AnchorLink>
              </Field>
            )}
            {m.offeringCount && (
              <Field label={t('movement.origin')}>
                <AnchorLink to="/finanzas/arqueos/$id" params={{ id: String(m.offeringCount.id) }} size="sm">
                  {t('counts.fromCount', { title: m.offeringCount.title ?? `#${m.offeringCount.id}` })}
                </AnchorLink>
              </Field>
            )}
            {!transfer && (
              <Field label={t('movement.category')}>
                <Text size="sm">{categoryLabel(m.category)}</Text>
              </Field>
            )}
            <Field label={t('movement.method')}>
              {m.paymentMethod && <Text size="sm">{t(`methods.${m.paymentMethod}`)}</Text>}
            </Field>
            <Field label={t('movement.reference')}>
              {m.reference && <Text size="sm">{m.reference}</Text>}
            </Field>
            {m.person !== undefined && m.kind === 'income' && !m.cellReport && (
              <Field label={t('movement.contributor')}>
                {m.person ? (
                  <AnchorLink to="/personas/$id" params={{ id: String(m.person.id) }} size="sm">
                    {fullName(m.person)}
                  </AnchorLink>
                ) : (
                  <Text size="sm" c="dimmed">
                    {t('movement.anonymous')}
                  </Text>
                )}
              </Field>
            )}
            {transfer && m.transferPairId && (
              <Field label={m.kind === 'transfer_out' ? t('transfer.to') : t('transfer.from')}>
                <AnchorLink
                  to="/finanzas/movimientos/$id"
                  params={{ id: String(m.transferPairId) }}
                  size="sm"
                >
                  {t('transfer.otherLeg')}
                </AnchorLink>
              </Field>
            )}
          </SimpleGrid>
          {m.description && (
            <Text size="sm" mt="md" style={{ whiteSpace: 'pre-wrap' }}>
              {m.description}
            </Text>
          )}
          <Text size="xs" c="dimmed" mt="md">
            {t('movement.createdBy', {
              name: m.createdBy ? fullName(m.createdBy) : '—',
              date: dayjs(m.createdAt).format('L LT'),
            })}
          </Text>
          {m.confirmedAt && (
            <Text size="xs" c="dimmed">
              {t('movement.confirmedAt', { date: dayjs(m.confirmedAt).format('L LT') })}
            </Text>
          )}
        </Card>

        <Card withBorder radius="lg">
          <Group justify="space-between" mb="sm">
            <Title order={3} size="h5">
              {t('receipts.title')}
            </Title>
            {canRegister && m.attachments.length < 5 && (
              <FileButton
                accept="image/*,application/pdf"
                onChange={async (file) => {
                  if (!file) return;
                  setUploading(true);
                  await act(() => financeApi.attach(m.id, file), t('receipts.added'));
                  setUploading(false);
                }}
              >
                {(props) => (
                  <Button
                    {...props}
                    size="compact-sm"
                    variant="light"
                    leftSection={<IconPaperclip size={14} />}
                    loading={uploading}
                  >
                    {t('receipts.add')}
                  </Button>
                )}
              </FileButton>
            )}
          </Group>
          {m.attachments.length === 0 ? (
            <Text size="sm" c="dimmed">
              {t('receipts.empty')}
            </Text>
          ) : (
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
              {m.attachments.map((f) => (
                <Attachment
                  key={f.id}
                  file={f}
                  canRemove={canRegister}
                  onRemove={() => removeAttachment(f.id)}
                />
              ))}
            </SimpleGrid>
          )}
          {canRegister && (
            <Text size="xs" c="dimmed" mt="xs">
              {t('receipts.limits')}
            </Text>
          )}
        </Card>
      </Stack>

      <MovementModal
        opened={editing}
        kind={m.kind === 'expense' ? 'expense' : 'income'}
        movement={m}
        onClose={() => setEditing(false)}
        onSaved={(saved) => {
          setEditing(false);
          update(saved);
          notifications.show({ color: 'teal', message: t('common:saved') });
        }}
      />
      <VoidModal
        opened={voiding}
        onClose={() => setVoiding(false)}
        onConfirm={async (reason) => {
          await act(() => financeApi.voidMovement(m.id, reason), t('void.done'));
          setVoiding(false);
        }}
      />
      <ConfirmPendingModal
        movement={confirming ? m : null}
        onClose={() => setConfirming(false)}
        onDone={(saved) => {
          setConfirming(false);
          update(saved);
          notifications.show({ color: 'teal', message: t('pending.confirmed') });
        }}
      />
      <VoidModal
        opened={rejecting}
        onClose={() => setRejecting(false)}
        labels={{
          title: t('pending.rejectTitle'),
          body: t('pending.rejectBody'),
          confirm: t('pending.reject'),
        }}
        onConfirm={async (reason) => {
          await act(() => financeApi.rejectPending(m.id, reason), t('pending.rejected'));
          setRejecting(false);
        }}
      />
    </>
  );
}
