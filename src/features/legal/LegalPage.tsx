import { Alert, Box, Center, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle, IconArrowLeft } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { AnchorLink } from '../../components/links';
import { ColorSchemeToggle } from '../../layout/ColorSchemeToggle';
import { LanguageMenu } from '../../layout/LanguageMenu';
import { LEGAL_DRAFT, LEGAL_SECTIONS, LEGAL_UPDATED, SUPPORT_EMAIL } from './constants';
import { LegalLinks } from './LegalLinks';

export function LegalPage({ doc }: { doc: keyof typeof LEGAL_SECTIONS }) {
  const { t } = useTranslation('legal');
  const vars = { email: SUPPORT_EMAIL };
  return (
    <Box mih="100dvh" bg="var(--mantine-color-body)">
      <Group justify="space-between" p="sm" gap={4}>
        {/* A la app: con sesión abre el inicio; sin sesión, el login. */}
        <AnchorLink to="/" size="sm">
          <Group gap={4}>
            <IconArrowLeft size={16} />
            {t('back')}
          </Group>
        </AnchorLink>
        <Group gap={4}>
          <LanguageMenu />
          <ColorSchemeToggle />
        </Group>
      </Group>
      <Center px="md" pb="xl">
        <Stack w="100%" maw={760} gap="lg">
          <Paper withBorder radius="lg" p={{ base: 'lg', sm: 'xl' }} shadow="xs">
            <Stack gap="lg">
              <div>
                <Title order={1} size="h2">
                  {t(`${doc}.title`)}
                </Title>
                <Text c="dimmed" size="sm" mt={4}>
                  {t('updated', { date: dayjs(LEGAL_UPDATED).format('LL') })}
                </Text>
              </div>
              {LEGAL_DRAFT && (
                <Alert color="yellow" icon={<IconAlertTriangle size={18} />}>
                  {t('draft')}
                </Alert>
              )}
              <Text>{t(`${doc}.intro`)}</Text>
              {LEGAL_SECTIONS[doc].map((key) => (
                <section key={key}>
                  <Title order={2} size="h4" mb={6}>
                    {t(`${doc}.sections.${key}.title` as never)}
                  </Title>
                  <Text>{t(`${doc}.sections.${key}.body` as never, vars)}</Text>
                </section>
              ))}
              <Text size="sm" c="dimmed">
                {t('contact', vars)}
              </Text>
            </Stack>
          </Paper>
          <LegalLinks />
        </Stack>
      </Center>
    </Box>
  );
}
