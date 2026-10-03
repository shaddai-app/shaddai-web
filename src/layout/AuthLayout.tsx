import { Box, Center, Group, Paper, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ShaddaiLogo } from '../components/BrandLogo';
import { LegalLinks } from '../features/legal/LegalLinks';
import { AnchorLink } from '../components/links';
import { ColorSchemeToggle } from './ColorSchemeToggle';
import { LanguageLinks } from './LanguageLinks';
import { LanguageMenu } from './LanguageMenu';
import classes from './AuthLayout.module.css';

/** Panel de marca: logo, lema con la línea dorada e idiomas (en el celular, una banda arriba). */
export function BrandPanel() {
  const { t } = useTranslation();
  return (
    <Box className={classes.brand}>
      <AnchorLink to="/" aria-label={t('appName')} w="fit-content">
        <ShaddaiLogo tone="dark" height={36} />
      </AnchorLink>
      <div>
        <p className={classes.headline}>{t('tagline')}</p>
        <div className={classes.goldLine} aria-hidden />
      </div>
      <div className={classes.languages}>
        <LanguageLinks c="rgba(255, 255, 255, 0.75)" />
      </div>
    </Box>
  );
}

/** Pantallas sin sesión completa (login, recuperación, pasos obligatorios): marca + tarjeta. */
export function AuthLayout({
  title,
  description,
  children,
}: {
  /** Sin título: lo pone el contenido (el login lo cambia en el paso de 2FA). */
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className={classes.root}>
      <BrandPanel />
      <main className={classes.main}>
        <Group justify="flex-end" p="sm" gap={4}>
          <LanguageMenu />
          <ColorSchemeToggle />
        </Group>
        <Center px="md" pb="xl" style={{ flex: 1 }}>
          <Stack w="100%" maw={420} gap="lg">
            <Paper
              withBorder
              radius="var(--sh-radio-tarjeta)"
              p={{ base: 'lg', sm: 'xl' }}
              className={classes.card}
            >
              <Stack gap="md">
                {title && (
                  <div>
                    <Title order={1} size="h3">
                      {title}
                    </Title>
                    {description && (
                      <Text c="dimmed" size="sm" mt={6}>
                        {description}
                      </Text>
                    )}
                  </div>
                )}
                {children}
              </Stack>
            </Paper>
            <LegalLinks />
          </Stack>
        </Center>
      </main>
    </div>
  );
}
