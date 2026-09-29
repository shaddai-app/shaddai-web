import { Badge, Button, Card, Group, Loader, SimpleGrid, Switch, Text, ThemeIcon } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconUsers } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ministriesApi } from '../../../../api/ministries';
import { requirePermission } from '../../../../auth/guards';
import { FormError } from '../../../../components/FormError';
import { UnstyledLink } from '../../../../components/links';
import { KIND_ICONS, ministriesKey } from '../../../../features/ministries/common';
import { MinistryFormModal } from '../../../../features/ministries/MinistryFormModal';
import { fullName } from '../../../../features/people/format';
import { PageHeader } from '../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/ministerios/')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'ministerios.ver'),
  component: MinistriesPage,
});

function MinistriesPage() {
  const { t } = useTranslation(['ministries', 'common']);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [includeInactive, setIncludeInactive] = useState(false);
  const [creating, setCreating] = useState(false);
  const query = useQuery({
    queryKey: [...ministriesKey, 'list', includeInactive],
    queryFn: () => ministriesApi.list(includeInactive),
  });

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          query.data?.canCreate && (
            <Button leftSection={<IconPlus size={18} />} onClick={() => setCreating(true)}>
              {t('new')}
            </Button>
          )
        }
      />
      <Switch
        mb="md"
        label={t('showInactive')}
        checked={includeInactive}
        onChange={(e) => setIncludeInactive(e.currentTarget.checked)}
      />
      {query.isPending ? (
        <Loader />
      ) : query.isError ? (
        <FormError error={query.error} />
      ) : query.data.items.length === 0 ? (
        <Text c="dimmed">{t('empty')}</Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md" maw={1100}>
          {query.data.items.map((m) => {
            const Icon = KIND_ICONS[m.kind];
            const color = m.color ?? 'blue';
            // El tipo no se repite si el ministerio se llama igual (ej. «Alabanza»).
            const kind = t(`kinds.${m.kind}`);
            const subtitle = [kind.toLowerCase() !== m.name.toLowerCase() && kind, m.campus?.name]
              .filter(Boolean)
              .join(' · ');
            return (
              <UnstyledLink key={m.id} to="/ministerios/$id" params={{ id: String(m.id) }}>
                <Card
                  withBorder
                  radius="lg"
                  h="100%"
                  style={{
                    borderTop: `4px solid var(--mantine-color-${color}-6)`,
                    opacity: m.isActive ? 1 : 0.6,
                  }}
                >
                  <Group wrap="nowrap" align="flex-start" gap="sm">
                    <ThemeIcon variant="light" color={color} size="lg" radius="md">
                      <Icon size={20} />
                    </ThemeIcon>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Group gap={6} wrap="nowrap">
                        <Text fw={600} truncate>
                          {m.name}
                        </Text>
                        {!m.isActive && (
                          <Badge size="xs" color="gray" variant="light">
                            {t('inactive')}
                          </Badge>
                        )}
                      </Group>
                      {subtitle && (
                        <Text size="xs" c="dimmed">
                          {subtitle}
                        </Text>
                      )}
                    </div>
                  </Group>
                  <Text size="sm" mt="sm" lineClamp={1} c={m.leaders.length ? undefined : 'dimmed'}>
                    {m.leaders.length ? m.leaders.map((l) => fullName(l)).join(', ') : t('noLeader')}
                  </Text>
                  <Group gap={4} mt={4}>
                    <IconUsers size={14} color="var(--mantine-color-dimmed)" />
                    <Text size="xs" c="dimmed">
                      {t('memberCount', { count: m.memberCount })}
                    </Text>
                  </Group>
                </Card>
              </UnstyledLink>
            );
          })}
        </SimpleGrid>
      )}
      <MinistryFormModal
        opened={creating}
        ministry={null}
        onClose={() => setCreating(false)}
        onSaved={(m) => {
          setCreating(false);
          void queryClient.invalidateQueries({ queryKey: ministriesKey });
          notifications.show({ color: 'teal', message: t('created') });
          void navigate({ to: '/ministerios/$id', params: { id: String(m.id) } });
        }}
      />
    </>
  );
}
