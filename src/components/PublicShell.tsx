import { Box, Center, Group, Image, Paper, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import { LegalLinks } from '../features/legal/LegalLinks';
import { ColorSchemeToggle } from '../layout/ColorSchemeToggle';
import { LanguageMenu } from '../layout/LanguageMenu';
import { ShaddaiIcon } from './BrandLogo';

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
    <Box mih="100dvh" bg="var(--sh-fondo-marco)">
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
              <ShaddaiIcon size={56} />
            )}
            {name && (
              <Text fw={600} size="lg" ta="center">
                {name}
              </Text>
            )}
          </Stack>
          <Paper withBorder radius="var(--sh-radio-tarjeta)" p={{ base: 'lg', sm: 'xl' }}>
            {children}
          </Paper>
          <LegalLinks />
        </Stack>
      </Center>
    </Box>
  );
}
