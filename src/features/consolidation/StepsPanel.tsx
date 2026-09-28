import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Menu,
  NumberInput,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconArrowDown, IconArrowUp, IconDots, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { stepsApi, type ConsolidationStep } from '../../api/consolidation';
import { FormError } from '../../components/FormError';
import { ResponsiveModal } from '../../components/ResponsiveModal';
import { errorMessage } from '../../i18n/errors';
import { stepsQuery, useStepLabel } from './steps';

function StepForm({
  step,
  onClose,
  onSaved,
}: {
  step: ConsolidationStep | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation(['consolidation', 'common']);
  const stepLabel = useStepLabel();
  const [name, setName] = useState(step?.name ?? '');
  const [dueDays, setDueDays] = useState<number>(step?.dueDays ?? 7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  // Un paso del sistema sin nombre propio muestra la traducción (vaciar el nombre la restaura).
  const systemName = step?.systemKey ? stepLabel({ name: null, systemKey: step.systemKey }) : null;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const trimmed = name.trim();
          if (step) await stepsApi.update(step.id, { name: trimmed || null, dueDays });
          else await stepsApi.create({ name: trimmed, dueDays });
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
          label={t('stepsAdmin.name')}
          placeholder={systemName ?? undefined}
          description={systemName ? t('stepsAdmin.systemNameHint') : undefined}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          maxLength={100}
          required={!systemName}
          data-autofocus
        />
        <NumberInput
          label={t('stepsAdmin.dueDays')}
          description={t('stepsAdmin.dueDaysHint')}
          value={dueDays}
          onChange={(v) => setDueDays(Math.max(0, Number(v) || 0))}
          min={0}
          max={365}
          allowDecimal={false}
          allowNegative={false}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={busy} disabled={!systemName && !name.trim()}>
            {t('common:actions.save')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

/** Pasos de consolidación (en Catálogos). */
export function StepsPanel() {
  const { t } = useTranslation(['consolidation', 'common']);
  const stepLabel = useStepLabel();
  const queryClient = useQueryClient();
  const query = useQuery(stepsQuery(true));
  const [editing, setEditing] = useState<{ step: ConsolidationStep | null } | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['consolidation'] });
  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await refresh();
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    }
  };

  if (query.isPending) return <Loader />;
  if (query.isError) return <FormError error={query.error} />;
  const items = query.data;
  const move = (index: number, delta: -1 | 1) => {
    const ids = items.map((i) => i.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + delta, 0, moved!);
    void act(() => stepsApi.reorder(ids));
  };
  const remove = (s: ConsolidationStep) =>
    modals.openConfirmModal({
      title: t('stepsAdmin.deleteTitle', { name: stepLabel(s) }),
      labels: { confirm: t('stepsAdmin.delete'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: () => void act(() => stepsApi.remove(s.id)),
    });

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="flex-start">
        <Text size="sm" c="dimmed" maw={640}>
          {t('stepsAdmin.hint')}
        </Text>
        <Button size="sm" leftSection={<IconPlus size={16} />} onClick={() => setEditing({ step: null })}>
          {t('stepsAdmin.add')}
        </Button>
      </Group>
      <Card withBorder radius="lg" p={0}>
        {items.map((s, i) => (
          <Group
            key={s.id}
            justify="space-between"
            wrap="nowrap"
            px="md"
            py="sm"
            style={{ borderTop: i ? '1px solid var(--mantine-color-default-border)' : undefined }}
            opacity={s.isActive ? 1 : 0.55}
          >
            <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
              <Badge variant="default" size="sm" circle>
                {i + 1}
              </Badge>
              <div style={{ minWidth: 0 }}>
                <Text size="sm" fw={500} truncate>
                  {stepLabel(s)}
                </Text>
                <Text size="xs" c="dimmed">
                  {t('board.dueDays', { count: s.dueDays })}
                </Text>
              </div>
            </Group>
            <Group gap={4} wrap="nowrap">
              <Switch
                size="sm"
                checked={s.isActive}
                aria-label={s.isActive ? t('stepsAdmin.deactivate') : t('stepsAdmin.activate')}
                onChange={(e) => void act(() => stepsApi.update(s.id, { isActive: e.currentTarget.checked }))}
                mr="xs"
              />
              <ActionIcon
                variant="subtle"
                color="gray"
                disabled={i === 0}
                aria-label={t('stepsAdmin.moveUp')}
                onClick={() => move(i, -1)}
                visibleFrom="xs"
              >
                <IconArrowUp size={16} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="gray"
                disabled={i === items.length - 1}
                aria-label={t('stepsAdmin.moveDown')}
                onClick={() => move(i, 1)}
                visibleFrom="xs"
              >
                <IconArrowDown size={16} />
              </ActionIcon>
              <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                  <ActionIcon variant="subtle" color="gray" aria-label={t('common:actions.more')}>
                    <IconDots size={16} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => setEditing({ step: s })}>
                    {t('stepsAdmin.edit')}
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconArrowUp size={16} />}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    hiddenFrom="xs"
                  >
                    {t('stepsAdmin.moveUp')}
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconArrowDown size={16} />}
                    disabled={i === items.length - 1}
                    onClick={() => move(i, 1)}
                    hiddenFrom="xs"
                  >
                    {t('stepsAdmin.moveDown')}
                  </Menu.Item>
                  {!s.systemKey && (
                    <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={() => remove(s)}>
                      {t('stepsAdmin.delete')}
                    </Menu.Item>
                  )}
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Group>
        ))}
      </Card>
      <ResponsiveModal
        opened={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.step ? t('stepsAdmin.edit') : t('stepsAdmin.add')}
        size="md"
      >
        {editing && (
          <StepForm
            step={editing.step}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              notifications.show({ color: 'teal', message: t('common:saved') });
              void refresh();
            }}
          />
        )}
      </ResponsiveModal>
    </Stack>
  );
}
