import { Badge, Card, Container, Group, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../api/http';

export const Route = createFileRoute('/')({ component: Home });

interface Ready {
  status: string;
  checks: { db: boolean };
}

function StatusBadge({ ok, loading }: { ok: boolean; loading: boolean }) {
  const { t } = useTranslation();
  if (loading)
    return (
      <Badge variant="light" color="gray">
        {t('status.checking')}
      </Badge>
    );
  return (
    <Badge variant="light" color={ok ? 'teal' : 'red'}>
      {ok ? t('status.ok') : t('status.down')}
    </Badge>
  );
}

function Home() {
  const { t } = useTranslation();
  // /health/ready responde 503 si la DB no está: ese caso es "API ok, DB caída".
  const ready = useQuery({
    queryKey: ['health', 'ready'],
    queryFn: async () => {
      try {
        return { api: true, db: (await apiFetch<Ready>('/health/ready')).checks.db };
      } catch (err) {
        const status = (err as { status?: number }).status;
        return { api: status === 503, db: false };
      }
    },
  });

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={2}>{t('appName')}</Title>
          <Text c="dimmed">{t('tagline')}</Text>
        </div>
        <Card withBorder padding="lg">
          <Title order={4} mb="md">
            {t('status.title')}
          </Title>
          <Stack gap="sm">
            <Group justify="space-between">
              <Text>{t('status.api')}</Text>
              <StatusBadge ok={ready.data?.api ?? false} loading={ready.isPending} />
            </Group>
            <Group justify="space-between">
              <Text>{t('status.database')}</Text>
              <StatusBadge ok={ready.data?.db ?? false} loading={ready.isPending} />
            </Group>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
