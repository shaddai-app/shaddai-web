import {
  ActionIcon,
  Button,
  Card,
  Group,
  Loader,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ACCOUNT_TYPES, financeApi, type AccountType, type FinanceAccount } from '../../../../api/finance';
import { requirePermission } from '../../../../auth/guards';
import { meQuery } from '../../../../auth/session';
import { FormError } from '../../../../components/FormError';
import { ResponsiveModal } from '../../../../components/ResponsiveModal';
import { ACCOUNT_ICONS, accountsQuery, useMoney } from '../../../../features/finance/common';
import { formatDate, todayIso } from '../../../../features/people/format';
import { errorMessage } from '../../../../i18n/errors';
import { PageHeader } from '../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/finanzas/cajas')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'finanzas.cajas'),
  component: AccountsPage,
});

/** Monedas frecuentes en la región (se puede escribir otra de 3 letras). */
const CURRENCIES = ['ARS', 'USD', 'EUR', 'BRL', 'UYU', 'CLP', 'PYG', 'BOB', 'PEN', 'COP', 'MXN'];

function AccountForm({
  account,
  onClose,
  onSaved,
}: {
  account: FinanceAccount | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t, i18n } = useTranslation(['finance', 'common']);
  const { data: me } = useSuspenseQuery(meQuery());
  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState<AccountType>(account?.type ?? 'cash');
  const [currency, setCurrency] = useState<string | null>(account?.currency ?? me.account?.currency ?? 'ARS');
  const [openingBalance, setOpeningBalance] = useState<number | ''>(account?.openingBalance ?? 0);
  const [openingDate, setOpeningDate] = useState(account?.openingDate ?? todayIso());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const en = i18n.resolvedLanguage === 'en';
  const currencies = [...new Set([...(currency ? [currency] : []), ...CURRENCIES])];

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const body = {
            name: name.trim(),
            type,
            currency: currency ?? undefined,
            openingBalance: Number(openingBalance) || 0,
            openingDate,
          };
          if (account) await financeApi.updateAccount(account.id, body);
          else await financeApi.createAccount(body);
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
          label={t('accounts.name')}
          placeholder={t('accounts.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          maxLength={100}
          required
          data-autofocus
        />
        <SegmentedControl
          fullWidth
          value={type}
          onChange={(v) => setType(v as AccountType)}
          data={ACCOUNT_TYPES.map((v) => ({ value: v, label: t(`accounts.types.${v}`) }))}
        />
        <Select
          label={t('accounts.currency')}
          description={account ? t('accounts.currencyLockedHint') : t('accounts.currencyHint')}
          data={currencies}
          value={currency}
          onChange={setCurrency}
          searchable
          allowDeselect={false}
          required
        />
        <SimpleGrid cols={2} spacing="sm">
          <NumberInput
            label={t('accounts.openingBalance')}
            value={openingBalance}
            onChange={(v) => setOpeningBalance(v === '' ? '' : Number(v))}
            decimalScale={2}
            decimalSeparator={en ? '.' : ','}
            thousandSeparator={en ? ',' : '.'}
          />
          <TextInput
            type="date"
            label={t('accounts.openingDate')}
            value={openingDate}
            max={todayIso()}
            onChange={(e) => setOpeningDate(e.currentTarget.value)}
            required
          />
        </SimpleGrid>
        <Text size="xs" c="dimmed">
          {t('accounts.openingHint')}
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={busy} disabled={!name.trim() || !currency}>
            {t('common:actions.save')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

function AccountsPage() {
  const { t } = useTranslation(['finance', 'common']);
  const queryClient = useQueryClient();
  const money = useMoney();
  const query = useQuery(accountsQuery(true));
  const [editing, setEditing] = useState<{ account: FinanceAccount | null } | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['finance'] });
  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await refresh();
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    }
  };
  const remove = (a: FinanceAccount) =>
    modals.openConfirmModal({
      title: t('accounts.deleteTitle', { name: a.name }),
      children: <Text size="sm">{t('accounts.deleteBody')}</Text>,
      labels: { confirm: t('accounts.delete'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: () => void act(() => financeApi.deleteAccount(a.id)),
    });

  return (
    <>
      <PageHeader
        title={t('accounts.title')}
        description={t('accounts.description')}
        actions={
          <Button leftSection={<IconPlus size={18} />} onClick={() => setEditing({ account: null })}>
            {t('accounts.add')}
          </Button>
        }
      />
      <FormError error={query.error} />
      {query.isPending ? (
        <Loader />
      ) : (
        <Card withBorder radius="lg" p={0}>
          {(query.data ?? []).map((a, i) => {
            const AccountIcon = ACCOUNT_ICONS[a.type];
            return (
              <Group
                key={a.id}
                justify="space-between"
                wrap="nowrap"
                px="md"
                py="sm"
                style={{ borderTop: i ? '1px solid var(--mantine-color-default-border)' : undefined }}
                opacity={a.isActive ? 1 : 0.55}
              >
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                  <ThemeIcon variant="light" radius="md">
                    <AccountIcon size={18} />
                  </ThemeIcon>
                  <div style={{ minWidth: 0 }}>
                    <Text size="sm" fw={500} truncate>
                      {a.name}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {t(`accounts.types.${a.type}`)} · {a.currency} ·{' '}
                      {t('accounts.openedOn', {
                        date: formatDate(a.openingDate),
                        amount: money(a.openingBalance, a.currency),
                      })}
                    </Text>
                  </div>
                </Group>
                <Group gap={4} wrap="nowrap">
                  <Text
                    size="sm"
                    fw={600}
                    mr="xs"
                    visibleFrom="xs"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {money(a.balance, a.currency)}
                  </Text>
                  <Switch
                    size="sm"
                    checked={a.isActive}
                    aria-label={a.isActive ? t('accounts.deactivate') : t('accounts.activate')}
                    onChange={(e) =>
                      void act(() => financeApi.updateAccount(a.id, { isActive: e.currentTarget.checked }))
                    }
                    mr="xs"
                  />
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    aria-label={t('accounts.edit')}
                    onClick={() => setEditing({ account: a })}
                  >
                    <IconPencil size={16} />
                  </ActionIcon>
                  <Tooltip label={t('accounts.delete')}>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label={t('accounts.delete')}
                      onClick={() => remove(a)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
            );
          })}
        </Card>
      )}
      <ResponsiveModal
        opened={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.account ? t('accounts.edit') : t('accounts.add')}
        size="md"
      >
        {editing && (
          <AccountForm
            account={editing.account}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              notifications.show({ color: 'teal', message: t('common:saved') });
              void refresh();
            }}
          />
        )}
      </ResponsiveModal>
    </>
  );
}
