import { Badge, ColorSwatch, Group, Text, type BadgeProps } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { CellStatus } from '../../api/cells';
import { CELL_STATUS_COLORS } from './structure';

export function CellStatusBadge({ status, ...props }: { status: CellStatus } & BadgeProps) {
  const { t } = useTranslation('cells');
  return (
    <Badge variant="light" color={CELL_STATUS_COLORS[status]} {...props}>
      {t(`status.${status}`)}
    </Badge>
  );
}

/** «● Red Norte · Zona 3» */
export function ZoneLabel({
  zone,
  size = 'sm',
  truncate = true,
}: {
  zone: { name: string; network: { name: string; color: string | null } };
  size?: 'xs' | 'sm';
  truncate?: boolean;
}) {
  return (
    <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
      <ColorSwatch
        color={`var(--mantine-color-${zone.network.color ?? 'gray'}-6)`}
        size={size === 'xs' ? 8 : 10}
        withShadow={false}
        style={{ flexShrink: 0 }}
      />
      <Text size={size} c="dimmed" truncate={truncate}>
        {zone.network.name} · {zone.name}
      </Text>
    </Group>
  );
}
