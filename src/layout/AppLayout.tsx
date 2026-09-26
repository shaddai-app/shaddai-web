import { AppShell, Group, Text, ThemeIcon } from '@mantine/core';
import { IconCross } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ColorSchemeToggle } from './ColorSchemeToggle';
import { LanguageMenu } from './LanguageMenu';

/** Shell base. En Fase 1 suma sidebar (desktop), bottom nav (mobile) y menú de usuario. */
export function AppLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="xs">
            <ThemeIcon variant="filled" radius="md" size="lg" aria-hidden>
              <IconCross size={18} />
            </ThemeIcon>
            <Text fw={600} size="lg">
              {t('appName')}
            </Text>
          </Group>
          <Group gap={4}>
            <LanguageMenu />
            <ColorSchemeToggle />
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
