import { Box, Center, Group, Image, Paper, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconCross } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { LegalLinks } from '../features/legal/LegalLinks';
import { ColorSchemeToggle } from '../layout/ColorSchemeToggle';
import { LanguageMenu } from '../layout/LanguageMenu';

/** Marco de las páginas públicas (sin sesión): logo y nombre de la iglesia, idioma y tema. */
export function PublicShell({
  logo,
  name,
  children,
}: {
  logo?: string | null;
  name?: string;
  children: ReactNode;
}) {
  return (
    <Box mih="100dvh" bg="var(--mantine-color-body)">
      <Group justify="flex-end" p="sm" gap={4}>
        <LanguageMenu />
        <ColorSchemeToggle />
      </Group>
      <Center px="md" pb="xl">
        <Stack w="100%" maw={520} gap="lg">
          <Stack align="center" gap={6}>
            {logo ? (
              <Image src={logo} alt="" w={64} h={64} radius="md" fit="contain" />
            ) : (
              <ThemeIcon size={56} radius="lg" aria-hidden>
                <IconCross size={30} />
              </ThemeIcon>
            )}
            {name && (
              <Text fw={600} size="lg" ta="center">
                {name}
              </Text>
            )}
          </Stack>
          <Paper withBorder radius="lg" p={{ base: 'lg', sm: 'xl' }} shadow="xs">
            {children}
          </Paper>
          <LegalLinks />
        </Stack>
      </Center>
    </Box>
  );
}
