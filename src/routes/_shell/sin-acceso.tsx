import { Button, Center, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { homePath } from '../../auth/guards';
import { meQuery } from '../../auth/session';

export const Route = createFileRoute('/_shell/sin-acceso')({ component: Forbidden });

function Forbidden() {
  const { t } = useTranslation();
  const { data: me } = useSuspenseQuery(meQuery());
  return (
    <Center mih="50vh">
      <Stack align="center" gap="sm" maw={420} ta="center">
        <ThemeIcon size={56} radius="xl" variant="light" color="gray" aria-hidden>
          <IconLock size={28} />
        </ThemeIcon>
        <Title order={1} size="h3">
          {t('forbidden.title')}
        </Title>
        <Text c="dimmed">{t('forbidden.body')}</Text>
        <Button component={Link} to={homePath(me)} variant="light">
          {t('nav.home')}
        </Button>
      </Stack>
    </Center>
  );
}
