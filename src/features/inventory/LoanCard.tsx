import { Alert, Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowsExchange } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loansApi, type InventoryItem, type Loan } from '../../api/inventory';
import { AnchorLink } from '../../components/links';
import { useDueLabel } from './common';
import { ExtendLoanModal, LoanBadge, NewLoanModal, ReturnLoanModal } from './LoanModals';
import { LoanRow } from './LoanRow';

/**
 * Préstamo del equipo en su ficha. Con inventario.prestamos: a quién está prestado, prestar,
 * devolver e historial. Sin ese permiso solo se ve hasta cuándo está prestado (no a quién).
 */
export function LoanCard({ item, canLend }: { item: InventoryItem; canLend: boolean }) {
  const { t } = useTranslation('inventory');
  const queryClient = useQueryClient();
  const dueLabel = useDueLabel();
  const [lending, setLending] = useState(false);
  const [returning, setReturning] = useState<Loan | null>(null);
  const [extending, setExtending] = useState<Loan | null>(null);
  const loans = useQuery({
    queryKey: ['inventory', 'loans', 'item', item.id],
    queryFn: () => loansApi.list({ itemId: item.id, state: 'all', pageSize: 20 }),
    enabled: canLend,
  });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['inventory'] });

  if (!canLend) {
    if (!item.loan) return null;
    return (
      <Card withBorder radius="lg">
        <Group gap="xs">
          <LoanBadge loan={item.loan} />
          <Text size="sm">{dueLabel(item.loan)}</Text>
        </Group>
      </Card>
    );
  }

  const rows = loans.data?.items ?? [];
  const open = rows.find((l) => l.returnedAt === null);
  const past = rows.filter((l) => l.returnedAt !== null).slice(0, 5);
  const blocked = item.status === 'repair' || item.status === 'retired';

  return (
    <Card withBorder radius="lg">
      <Group justify="space-between" gap="sm" mb={4}>
        <Title order={2} size="h6">
          {t('loans.history')}
        </Title>
        {item.loan && <LoanBadge loan={item.loan} size="sm" />}
      </Group>
      {open ? (
        <LoanRow
          loan={open}
          showItem={false}
          onReturn={setReturning}
          onExtend={setExtending}
          onChanged={refresh}
        />
      ) : blocked ? (
        <Alert color="gray" p="xs" my="xs">
          <Text size="sm">{t('loans.unavailable', { status: t(`status.${item.status}`) })}</Text>
        </Alert>
      ) : (
        <Stack gap="xs" my="xs">
          <Text size="sm" c="dimmed">
            {t('loans.available')}
          </Text>
          <Button
            variant="light"
            leftSection={<IconArrowsExchange size={16} />}
            onClick={() => setLending(true)}
            disabled={loans.isPending}
          >
            {t('loans.lend')}
          </Button>
        </Stack>
      )}
      {past.length > 0 && (
        <Stack gap={0} mt="xs" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
          {past.map((loan) => (
            <LoanRow
              key={loan.id}
              loan={loan}
              showItem={false}
              onReturn={setReturning}
              onExtend={setExtending}
              onChanged={refresh}
            />
          ))}
        </Stack>
      )}
      {loans.data && !open && past.length === 0 && (
        <Text size="xs" c="dimmed">
          {t('loans.historyEmpty')}
        </Text>
      )}
      {(loans.data?.total ?? 0) > 1 && (
        <AnchorLink to="/inventario/prestamos" size="xs" mt="xs" display="block">
          {t('loans.seeAll')}
        </AnchorLink>
      )}
      <NewLoanModal
        opened={lending}
        item={item}
        onClose={() => setLending(false)}
        onSaved={() => {
          setLending(false);
          refresh();
          notifications.show({ color: 'teal', message: t('loans.created') });
        }}
      />
      <ReturnLoanModal
        loan={returning}
        onClose={() => setReturning(null)}
        onSaved={() => {
          setReturning(null);
          refresh();
          notifications.show({ color: 'teal', message: t('loans.returned') });
        }}
      />
      <ExtendLoanModal
        loan={extending}
        onClose={() => setExtending(null)}
        onSaved={() => {
          setExtending(null);
          refresh();
          notifications.show({ color: 'teal', message: t('loans.extended') });
        }}
      />
    </Card>
  );
}
