import { Box, Center, Group, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconCross } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ColorSchemeToggle } from './ColorSchemeToggle';
import { LanguageMenu } from './LanguageMenu';

/** Pantallas sin sesión completa (login, recuperación, pasos obligatorios): tarjeta centrada. */
export function AuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <Box mih="100dvh" bg="var(--mantine-color-body)">
      <Group justify="flex-end" p="sm" gap={4}>
        <LanguageMenu />
        <ColorSchemeToggle />
      </Group>
      <Center px="md" pb="xl">
        <Stack w="100%" maw={420} gap="lg">
          <Stack align="center" gap={6}>
            <ThemeIcon size={52} radius="lg" aria-hidden>
              <IconCross size={28} />
            </ThemeIcon>
            <Text fw={600} size="lg">
              {t('appName')}
            </Text>
          </Stack>
          <Paper withBorder radius="lg" p={{ base: 'lg', sm: 'xl' }} shadow="xs">
            <Stack gap="md">
              <div>
                <Title order={2} size="h3">
                  {title}
                </Title>
                {description && (
                  <Text c="dimmed" size="sm" mt={6}>
                    {description}
                  </Text>
                )}
              </div>
              {children}
            </Stack>
          </Paper>
        </Stack>
      </Center>
    </Box>
  );
}
