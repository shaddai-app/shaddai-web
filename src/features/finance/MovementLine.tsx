import { Badge, Group, Text } from '@mantine/core';
import { IconArrowsExchange, IconPaperclip } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { Movement } from '../../api/finance';
import { UnstyledLink } from '../../components/links';
import { formatDate, fullName } from '../people/format';
import {
  kindColor,
  signedAmount,
  STATUS_COLORS,
  useCategoryLabel,
  useChurchCurrency,
  useMoney,
  useMovementOrigin,
} from './common';

/** Fila de un movimiento (resumen y listado): toda la fila abre el detalle. */
export function MovementLine({ m, showAccount = true }: { m: Movement; showAccount?: boolean }) {
  const { t } = useTranslation('finance');
  const money = useMoney();
  const categoryLabel = useCategoryLabel();
  const origin = useMovementOrigin();
  const churchCurrency = useChurchCurrency();
  const transfer = m.kind === 'transfer_in' || m.kind === 'transfer_out';
  const struck = m.status === 'voided' || m.status === 'rejected';
  const title = transfer ? t(`kinds.${m.kind}`) : categoryLabel(m.category);
  const meta = [
    formatDate(m.date),
    showAccount && m.financeAccount?.name,
    origin(m),
    m.person && fullName(m.person),
    // En los de un arqueo la descripción es el título, que ya está en el origen.
    m.description !== m.offeringCount?.title && m.description,
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
            <Text size="sm" fw={500} truncate td={struck ? 'line-through' : undefined}>
              {title}
            </Text>
            {m.attachmentCount > 0 && <IconPaperclip size={13} color="var(--mantine-color-dimmed)" />}
          </Group>
          <Text size="xs" c="dimmed" truncate>
            {meta.join(' · ')}
          </Text>
        </div>
        <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
          {m.status !== 'confirmed' && (
            <Badge size="xs" color={STATUS_COLORS[m.status]} variant="light">
              {t(`status.${m.status}`)}
            </Badge>
          )}
          <Text
            size="sm"
            fw={600}
            c={struck || m.status === 'pending' ? 'dimmed' : kindColor(m.kind)}
            td={struck ? 'line-through' : undefined}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {money(signedAmount(m.kind, m.amount), m.financeAccount?.currency ?? churchCurrency, {
              signed: true,
            })}
          </Text>
        </Group>
      </Group>
    </UnstyledLink>
  );
}
