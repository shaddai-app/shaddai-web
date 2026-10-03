import {
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Menu,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Timeline,
  Title,
  ActionIcon,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconArrowBackUp, IconCheck, IconDots, IconPlayerPlay, IconX } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { casesApi, type CaseDetail, type CaseStepState } from '../../../../api/consolidation';
import { requirePermission } from '../../../../auth/guards';
import { FormError } from '../../../../components/FormError';
import { AnchorLink } from '../../../../components/links';
import { ResponsiveModal } from '../../../../components/ResponsiveModal';
import { CaseStatusBadge, ContactButtons } from '../../../../features/consolidation/CaseBits';
import { NearestCells } from '../../../../features/consolidation/NearestCells';
import { FollowUpsPanel } from '../../../../features/consolidation/FollowUps';
import { consolidatorsQuery, useStepLabel } from '../../../../features/consolidation/steps';
import { formatDate, fullName } from '../../../../features/people/format';
import { PersonAvatar, StatusBadge } from '../../../../features/people/PersonBits';
import { errorMessage } from '../../../../i18n/errors';
import { PageHeader } from '../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/consolidacion/$caseId')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'consolidacion.ver'),
  component: CasePage,
});

const caseKey = (id: number) => ['consolidation', 'case', id];

/** Modal con un texto (nota al completar un paso, motivo de baja). */
function TextPrompt({
  opened,
  title,
  label,
  required,
  confirm,
  onClose,
  onConfirm,
}: {
  opened: boolean;
  title: string;
  label: string;
  required: boolean;
  confirm: string;
  onClose: () => void;
  onConfirm: (text: string) => Promise<void>;
}) {
  const { t } = useTranslation('common');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <ResponsiveModal opened={opened} onClose={onClose} title={title} size="md">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await onConfirm(text.trim());
            setText('');
          } finally {
            setBusy(false);
          }
        }}
      >
        <Stack>
          <Textarea
            label={label}
            value={text}
            onChange={(e) => setText(e.currentTarget.value)}
            autosize
            minRows={3}
            maxLength={1000}
            required={required}
            data-autofocus
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              {t('actions.cancel')}
            </Button>
            <Button type="submit" loading={busy} disabled={required && !text.trim()}>
              {confirm}
            </Button>
          </Group>
        </Stack>
      </form>
    </ResponsiveModal>
  );
}

function StepsCard({ c, onChange }: { c: CaseDetail; onChange: (c: CaseDetail) => void }) {
  const { t } = useTranslation('consolidation');
  const stepLabel = useStepLabel();
  const [completing, setCompleting] = useState<CaseStepState | null>(null);
  const editable = c.access.manage && c.status !== 'dropped';
  // Resaltado hasta el último paso completado.
  const lastDone = c.steps.reduce((last, s, i) => (s.completedAt ? i : last), -1);

  const act = async (fn: () => Promise<CaseDetail>) => {
    try {
      onChange(await fn());
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    }
  };

  return (
    <Card withBorder radius="lg">
      <Title order={3} size="h5" mb="md">
        {t('case.steps', c.progress)}
      </Title>
      <Timeline active={lastDone} bulletSize={24} lineWidth={2}>
        {c.steps.map((s) => (
          <Timeline.Item
            key={s.id}
            bullet={s.completedAt ? <IconCheck size={14} /> : undefined}
            color={s.completedAt ? 'teal' : s.overdue ? 'red' : undefined}
            title={
              <Group justify="space-between" wrap="nowrap" gap="xs">
                <Text
                  size="sm"
                  fw={s.step.id === c.currentStepId ? 700 : 500}
                  td={s.step.isActive ? undefined : 'line-through'}
                >
                  {stepLabel(s.step)}
                </Text>
                {editable &&
                  (s.completedAt ? (
                    <Button
                      size="compact-xs"
                      variant="subtle"
                      color="gray"
                      leftSection={<IconArrowBackUp size={12} />}
                      onClick={() => void act(() => casesApi.undo(c.id, s.step.id))}
                    >
                      {t('case.undo')}
                    </Button>
                  ) : (
                    <Button
                      size="compact-xs"
                      variant={s.step.id === c.currentStepId ? 'filled' : 'light'}
                      leftSection={<IconCheck size={12} />}
                      onClick={() => setCompleting(s)}
                    >
                      {t('case.complete')}
                    </Button>
                  ))}
              </Group>
            }
          >
            <Text size="xs" c={s.overdue ? 'red' : 'dimmed'}>
              {s.completedAt
                ? t('case.completedOn', { date: formatDate(s.completedAt) })
                : s.overdue
                  ? t('due.overdue', { date: formatDate(s.dueAt) })
                  : t('due.on', { date: formatDate(s.dueAt) })}
            </Text>
            {s.notes && (
              <Text size="xs" mt={2} style={{ whiteSpace: 'pre-wrap' }}>
                {s.notes}
              </Text>
            )}
          </Timeline.Item>
        ))}
      </Timeline>
      <TextPrompt
        opened={completing !== null}
        title={completing ? t('case.completeTitle', { step: stepLabel(completing.step) }) : ''}
        label={t('case.stepNotes')}
        required={false}
        confirm={t('case.complete')}
        onClose={() => setCompleting(null)}
        onConfirm={async (notes) => {
          if (!completing) return;
          await act(() => casesApi.complete(c.id, completing.step.id, notes || null));
          setCompleting(null);
        }}
      />
    </Card>
  );
}

function CasePage() {
  const { t } = useTranslation(['consolidation', 'common']);
  const id = Number(Route.useParams().caseId);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: caseKey(id), queryFn: () => casesApi.get(id) });
  const [dropping, setDropping] = useState(false);
  const consolidators = useQuery({ ...consolidatorsQuery(), enabled: Boolean(query.data?.access.assign) });

  const update = (c: CaseDetail) => {
    queryClient.setQueryData(caseKey(id), c);
    void queryClient.invalidateQueries({ queryKey: ['consolidation', 'board'] });
    void queryClient.invalidateQueries({ queryKey: ['consolidation', 'cases'] });
  };
  const act = async (fn: () => Promise<CaseDetail>, message?: string) => {
    try {
      update(await fn());
      if (message) notifications.show({ color: 'teal', message });
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    }
  };

  if (query.isPending) return <Loader />;
  if (query.isError) return <FormError error={query.error} />;
  const c = query.data;
  const p = c.person;

  return (
    <>
      <PageHeader
        back={{ to: '/consolidacion' }}
        title={fullName(p)}
        badge={<CaseStatusBadge status={c.status} />}
        description={t('case.openedFrom', { date: formatDate(c.openedAt), source: t(`sources.${c.source}`) })}
        actions={
          c.access.manage && (
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon variant="default" size="lg" aria-label={t('common:actions.more')}>
                  <IconDots size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                {c.status === 'open' ? (
                  <Menu.Item color="red" leftSection={<IconX size={16} />} onClick={() => setDropping(true)}>
                    {t('case.drop')}
                  </Menu.Item>
                ) : (
                  <Menu.Item
                    leftSection={<IconPlayerPlay size={16} />}
                    onClick={() =>
                      modals.openConfirmModal({
                        title: t('case.reopenTitle'),
                        labels: { confirm: t('case.reopen'), cancel: t('common:actions.cancel') },
                        onConfirm: () =>
                          void act(() => casesApi.setStatus(c.id, { status: 'open' }), t('case.reopened')),
                      })
                    }
                  >
                    {t('case.reopen')}
                  </Menu.Item>
                )}
              </Menu.Dropdown>
            </Menu>
          )
        }
      />
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Stack gap="md">
          <Card withBorder radius="lg">
            <Group justify="space-between" wrap="nowrap" align="flex-start">
              <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                <PersonAvatar person={p} size={44} />
                <div style={{ minWidth: 0 }}>
                  <AnchorLink to="/personas/$id" params={{ id: String(p.id) }} fw={600}>
                    {t('case.viewPerson')}
                  </AnchorLink>
                  {p.status && (
                    <div>
                      <StatusBadge status={p.status} size="xs" />
                    </div>
                  )}
                </div>
              </Group>
              <ContactButtons phone={p.phone} firstName={p.firstName} />
            </Group>
            {c.status !== 'open' && c.closeReason && (
              <Text size="sm" mt="sm">
                <Text span c="dimmed">
                  {t('case.closeReason')}:{' '}
                </Text>
                {t(`closeReasons.${c.closeReason}`, { defaultValue: c.closeReason })}
              </Text>
            )}
          </Card>

          <Card withBorder radius="lg">
            <Text size="xs" c="dimmed" mb={4}>
              {t('cases.consolidator')}
            </Text>
            {c.access.assign && c.status === 'open' ? (
              <Select
                aria-label={t('cases.consolidator')}
                placeholder={t('board.unassigned')}
                data={(consolidators.data ?? []).map((u) => ({ value: String(u.id), label: fullName(u) }))}
                value={c.consolidator ? String(c.consolidator.id) : null}
                onChange={(v) =>
                  void act(() => casesApi.assign(c.id, v ? Number(v) : null), t('case.assigned'))
                }
                clearable
                searchable
              />
            ) : (
              <Group gap="xs">
                <Text size="sm">{c.consolidator ? fullName(c.consolidator) : '—'}</Text>
                {!c.consolidator && (
                  <Badge color="orange" variant="light" size="sm">
                    {t('board.unassigned')}
                  </Badge>
                )}
              </Group>
            )}
          </Card>

          <StepsCard c={c} onChange={update} />
          {c.status === 'open' && <NearestCells personId={p.id} />}
        </Stack>

        <FollowUpsPanel
          personId={p.id}
          items={c.followUps}
          canAdd={c.access.manage}
          onChange={(items) => {
            queryClient.setQueryData<CaseDetail>(
              caseKey(id),
              (prev) => prev && { ...prev, followUps: items },
            );
            void queryClient.invalidateQueries({ queryKey: ['consolidation'] });
          }}
        />
      </SimpleGrid>

      <TextPrompt
        opened={dropping}
        title={t('case.dropTitle', { name: fullName(p) })}
        label={t('case.dropReason')}
        required
        confirm={t('case.drop')}
        onClose={() => setDropping(false)}
        onConfirm={async (reason) => {
          await act(
            () => casesApi.setStatus(c.id, { status: 'dropped', closeReason: reason }),
            t('case.dropped'),
          );
          setDropping(false);
        }}
      />
    </>
  );
}
