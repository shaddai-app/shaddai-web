import { ActionIcon, Badge, Button, Group, Menu, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconCalendarEvent, IconDots, IconRotateClockwise, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { loansApi, type Loan } from '../../api/inventory';
import { AnchorLink } from '../../components/links';
import { errorMessage } from '../../i18n/errors';
import { formatDate, fullName } from '../people/format';
import { useDueLabel } from './common';

/** Una fila de préstamo con sus acciones (también la usa la ficha del equipo). */
export function LoanRow({
  loan,
  showItem = true,
  onReturn,
  onExtend,
  onChanged,
}: {
  loan: Loan;
  showItem?: boolean;
  onReturn: (l: Loan) => void;
  onExtend: (l: Loan) => void;
  onChanged: () => void;
}) {
  const { t } = useTranslation(['inventory', 'common']);
  const dueLabel = useDueLabel();
  const open = loan.returnedAt === null;
  const remove = () =>
    modals.openConfirmModal({
      title: t('loans.deleteTitle'),
      children: <Text size="sm">{t('loans.deleteBody')}</Text>,
      labels: { confirm: t('loans.delete'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await loansApi.remove(loan.id);
          onChanged();
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });
  return (
    <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm" py="xs">
      <div style={{ minWidth: 0 }}>
        {showItem && (
          <AnchorLink
            to="/inventario/$id"
            params={{ id: String(loan.item.id) }}
            fw={500}
            c="inherit"
            disabled={loan.item.deleted}
            style={{ display: 'block', overflowWrap: 'anywhere' }}
          >
            {loan.item.name}{' '}
            <Text span size="xs" c="dimmed">
              {loan.item.code}
            </Text>
          </AnchorLink>
        )}
        <Text size="sm" fw={showItem ? undefined : 500}>
          {fullName(loan.borrower)}
          {loan.borrower.phone && (
            <Text span size="xs" c="dimmed">
              {' · '}
              {loan.borrower.phone}
            </Text>
          )}
        </Text>
        <Text size="xs" c="dimmed">
          {t('loans.period', { from: formatDate(loan.borrowedAt), to: formatDate(loan.dueAt) })}
          {loan.returnedAt && ` · ${t('loans.returnedOn', { date: formatDate(loan.returnedAt) })}`}
        </Text>
        {(loan.conditionOut || loan.conditionIn || loan.notes) && (
          <Text size="xs" c="dimmed" style={{ overflowWrap: 'anywhere' }}>
            {[loan.conditionOut, loan.conditionIn, loan.notes].filter(Boolean).join(' · ')}
          </Text>
        )}
        {open && (
          <Badge mt={4} size="sm" variant="light" color={loan.overdue ? 'red' : 'grape'}>
            {dueLabel(loan)}
          </Badge>
        )}
      </div>
      <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
        {open && (
          <Button
            size="compact-sm"
            variant="light"
            leftSection={<IconRotateClockwise size={14} />}
            onClick={() => onReturn(loan)}
            visibleFrom="xs"
          >
            {t('loans.giveBack')}
          </Button>
        )}
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" aria-label={t('common:actions.more')}>
              <IconDots size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            {open && (
              <>
                <Menu.Item
                  hiddenFrom="xs"
                  leftSection={<IconRotateClockwise size={16} />}
                  onClick={() => onReturn(loan)}
                >
                  {t('loans.giveBack')}
                </Menu.Item>
                <Menu.Item leftSection={<IconCalendarEvent size={16} />} onClick={() => onExtend(loan)}>
                  {t('loans.extend')}
                </Menu.Item>
              </>
            )}
            <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={remove}>
              {t('loans.delete')}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  );
}
