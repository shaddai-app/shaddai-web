import {
  ActionIcon,
  Box,
  Card,
  ColorSwatch,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Switch,
  Text,
} from '@mantine/core';
import { IconChevronDown, IconChevronRight, IconUsers } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { multiplicationApi } from '../../../../api/cells';
import { requirePermission } from '../../../../auth/guards';
import { FormError } from '../../../../components/FormError';
import { AnchorLink } from '../../../../components/links';
import { CellStatusBadge } from '../../../../features/cells/CellBits';
import { buildTree, isAlive, treeStats, type TreeNode } from '../../../../features/cells/genealogy';
import { formatDate, fullName } from '../../../../features/people/format';
import { PageHeader } from '../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/celulas/genealogia')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'celulas.ver'),
  component: GenealogyPage,
});

function Node({
  node,
  collapsed,
  toggle,
  showClosed,
}: {
  node: TreeNode;
  collapsed: Set<number>;
  toggle: (id: number) => void;
  showClosed: boolean;
}) {
  const { t } = useTranslation('cells');
  const visibleChildren = node.children.filter((c) => showClosed || isAlive(c));
  const open = !collapsed.has(node.id);
  const inactive = node.status === 'closed' || node.status === 'multiplied';
  return (
    <div>
      <Group gap={6} wrap="nowrap" align="flex-start" py={6} opacity={inactive ? 0.6 : 1}>
        {visibleChildren.length > 0 ? (
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            mt={2}
            onClick={() => toggle(node.id)}
            aria-label={open ? t('genealogy.collapse') : t('genealogy.expand')}
            aria-expanded={open}
          >
            {open ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
          </ActionIcon>
        ) : (
          <Box w={22} />
        )}
        <Card withBorder radius="md" p="xs" style={{ flex: 1, minWidth: 0 }}>
          <Group justify="space-between" wrap="nowrap" gap="xs">
            <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
              <ColorSwatch
                color={`var(--mantine-color-${node.zone.network.color ?? 'gray'}-6)`}
                size={10}
                withShadow={false}
                style={{ flexShrink: 0 }}
              />
              <div style={{ minWidth: 0 }}>
                <AnchorLink
                  to="/celulas/$id"
                  params={{ id: String(node.id) }}
                  size="sm"
                  fw={600}
                  c="var(--mantine-color-text)"
                >
                  {node.name}
                </AnchorLink>
                <Text size="xs" c="dimmed" truncate>
                  {[
                    fullName(node.leader),
                    node.multipliedAt
                      ? t('genealogy.bornOn', { date: formatDate(node.multipliedAt) })
                      : node.startedAt && t('genealogy.startedOn', { date: formatDate(node.startedAt) }),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </div>
            </Group>
            <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
              <Group gap={2} wrap="nowrap" c="dimmed">
                <IconUsers size={14} />
                <Text size="xs">{node.memberCount}</Text>
              </Group>
              {node.status !== 'active' && <CellStatusBadge status={node.status} size="xs" />}
            </Group>
          </Group>
        </Card>
      </Group>
      {open && visibleChildren.length > 0 && (
        // Línea vertical que une a la madre con sus hijas.
        <Box ml={10} pl={16} style={{ borderLeft: '2px solid var(--mantine-color-default-border)' }}>
          {visibleChildren.map((c) => (
            <Node key={c.id} node={c} collapsed={collapsed} toggle={toggle} showClosed={showClosed} />
          ))}
        </Box>
      )}
    </div>
  );
}

function GenealogyPage() {
  const { t } = useTranslation('cells');
  const query = useQuery({ queryKey: ['cells', 'genealogy'], queryFn: multiplicationApi.genealogy });
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [showClosed, setShowClosed] = useState(false);
  const toggle = (id: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const roots = query.data ? buildTree(query.data.items) : [];
  const stats = treeStats(roots);
  const visibleRoots = roots.filter((r) => showClosed || isAlive(r));

  return (
    <>
      <PageHeader title={t('genealogy.title')} description={t('genealogy.description')} />
      <Stack gap="md" maw={860}>
        <FormError error={query.error} />
        {query.isPending ? (
          <Loader />
        ) : (
          <>
            <SimpleGrid cols={3} spacing="sm">
              {(['cells', 'generations', 'multiplications'] as const).map((k) => (
                <Card key={k} withBorder radius="md" p="sm">
                  <Text size="xs" c="dimmed">
                    {t(`genealogy.stats.${k}`)}
                  </Text>
                  <Text fw={700} size="xl">
                    {stats[k]}
                  </Text>
                </Card>
              ))}
            </SimpleGrid>
            <Switch
              label={t('genealogy.showClosed')}
              checked={showClosed}
              onChange={(e) => setShowClosed(e.currentTarget.checked)}
            />
            {visibleRoots.length === 0 ? (
              <Text c="dimmed">{t('list.empty')}</Text>
            ) : (
              <div>
                {visibleRoots.map((r) => (
                  <Node key={r.id} node={r} collapsed={collapsed} toggle={toggle} showClosed={showClosed} />
                ))}
              </div>
            )}
          </>
        )}
      </Stack>
    </>
  );
}
