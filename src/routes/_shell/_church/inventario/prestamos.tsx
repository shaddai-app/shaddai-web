import { Button, Card, Chip, Group, Loader, Stack, Text, TextInput } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LOAN_STATES, loansApi, type Loan, type LoanState } from '../../../../api/inventory';
import { requirePermission } from '../../../../auth/guards';
import { FormError } from '../../../../components/FormError';
import { ExtendLoanModal, NewLoanModal, ReturnLoanModal } from '../../../../features/inventory/LoanModals';
import { LoanRow } from '../../../../features/inventory/LoanRow';
import { PageHeader } from '../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/inventario/prestamos')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'inventario.prestamos'),
  component: LoansPage,
});

function LoansPage() {
  const { t } = useTranslation(['inventory', 'common']);
  const queryClient = useQueryClient();
  const [state, setState] = useState<LoanState>('open');
  const [q, setQ] = useState('');
  const [debounced] = useDebouncedValue(q, 300);
  const [creating, setCreating] = useState(false);
  const [returning, setReturning] = useState<Loan | null>(null);
  const [extending, setExtending] = useState<Loan | null>(null);
  const query = useQuery({
    queryKey: ['inventory', 'loans', state, debounced],
    queryFn: () => loansApi.list({ state, q: debounced || undefined, pageSize: 200 }),
    placeholderData: keepPreviousData,
  });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['inventory'] });
  const counts = query.data?.counts;

  return (
    <>
      <PageHeader
        title={t('loans.title')}
        description={t('loans.description')}
        actions={
          <Button leftSection={<IconPlus size={18} />} onClick={() => setCreating(true)}>
            {t('loans.new')}
          </Button>
        }
      />
      <Stack gap="md">
        <TextInput
          leftSection={<IconSearch size={16} />}
          placeholder={t('loans.search')}
          aria-label={t('loans.search')}
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
        />
        <Chip.Group value={state} onChange={(v) => setState(v as LoanState)}>
          <Group gap={6}>
            {LOAN_STATES.map((s) => (
              <Chip key={s} value={s} size="sm" color={s === 'overdue' ? 'red' : undefined}>
                {t(`loans.states.${s}`)}
                {counts && (s === 'open' || s === 'overdue') ? ` · ${counts[s]}` : ''}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
        {query.isPending ? (
          <Loader />
        ) : query.isError ? (
          <FormError error={query.error} />
        ) : query.data.items.length === 0 ? (
          <Text c="dimmed">{debounced || state !== 'open' ? t('loans.noResults') : t('loans.empty')}</Text>
        ) : (
          <Card withBorder radius="lg" py={4}>
            {query.data.items.map((loan, i) => (
              <div
                key={loan.id}
                style={{ borderTop: i ? '1px solid var(--mantine-color-default-border)' : undefined }}
              >
                <LoanRow loan={loan} onReturn={setReturning} onExtend={setExtending} onChanged={refresh} />
              </div>
            ))}
          </Card>
        )}
      </Stack>
      <NewLoanModal
        opened={creating}
        item={null}
        onClose={() => setCreating(false)}
        onSaved={() => {
          setCreating(false);
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
    </>
  );
}
