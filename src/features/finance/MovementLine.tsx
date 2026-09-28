import { Badge, Group, Text } from '@mantine/core';
import { IconArrowsExchange, IconPaperclip } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { Movement } from '../../api/finance';
import { UnstyledLink } from '../../components/links';
import { formatDate, fullName } from '../people/format';
import { kindColor, signedAmount, useCategoryLabel, useMoney } from './common';

/** Fila de un movimiento (resumen y listado): toda la fila abre el detalle. */
export function MovementLine({ m, showAccount = true }: { m: Movement; showAccount?: boolean }) {
  const { t } = useTranslation('finance');
  const money = useMoney();
  const categoryLabel = useCategoryLabel();
  const transfer = m.kind === 'transfer_in' || m.kind === 'transfer_out';
  const voided = m.status === 'voided';
  const title = transfer ? t(`kinds.${m.kind}`) : categoryLabel(m.category);
  const meta = [
    formatDate(m.date),
    showAccount && m.financeAccount.name,
    m.person && fullName(m.person),
    m.description,
  ].filter(Boolean);

  return (
    <UnstyledLink
      to="/finanzas/movimientos/$id"
      params={{ id: String(m.id) }}
      px="md"
      py="sm"
      style={{ display: 'block', borderTop: '1px solid var(--mantine-color-default-border)' }}
    >
      <Group justify="space-between" wrap="nowrap" gap="sm">
        <div style={{ minWidth: 0 }}>
          <Group gap={6} wrap="nowrap">
            {transfer && <IconArrowsExchange size={14} />}
            <Text size="sm" fw={500} truncate td={voided ? 'line-through' : undefined}>
              {title}
            </Text>
            {m.attachmentCount > 0 && <IconPaperclip size={13} color="var(--mantine-color-dimmed)" />}
          </Group>
          <Text size="xs" c="dimmed" truncate>
            {meta.join(' · ')}
          </Text>
        </div>
        <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
          {voided && (
            <Badge size="xs" color="gray" variant="light">
              {t('status.voided')}
            </Badge>
          )}
          <Text
            size="sm"
            fw={600}
            c={voided ? 'dimmed' : kindColor(m.kind)}
            td={voided ? 'line-through' : undefined}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {money(signedAmount(m.kind, m.amount), m.financeAccount.currency, { signed: true })}
          </Text>
        </Group>
      </Group>
    </UnstyledLink>
  );
}
