import { Box, Group, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';

export function PageHeader({
  title,
  badge,
  description,
  actions,
}: {
  title: string;
  /** Junto al título (ej. el estado del registro). */
  badge?: ReactNode;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <Group justify="space-between" align="flex-start" mb="lg" gap="sm">
      <Stack gap={6}>
        <Group gap="sm" align="center">
          <Title order={1} size="h2">
            {title}
          </Title>
          {badge}
        </Group>
        {/* Línea corta bajo el título (detalle de la marca). */}
        <Box w={36} h={3} bg="var(--sh-detalle-suave)" style={{ borderRadius: 2 }} aria-hidden />
        {description && (
          <Text c="dimmed" size="sm">
            {description}
          </Text>
        )}
      </Stack>
      {actions}
    </Group>
  );
}
