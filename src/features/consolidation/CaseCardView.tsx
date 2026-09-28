import { ActionIcon, Card, Group, Menu, Progress, Stack, Text } from '@mantine/core';
import { IconArrowsMove, IconDots } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { CaseCard, ConsolidationStep } from '../../api/consolidation';
import { AnchorLink } from '../../components/links';
import { fullName } from '../people/format';
import { PersonAvatar } from '../people/PersonBits';
import { ContactButtons, DueText } from './CaseBits';
import { useStepLabel } from './steps';

/** Tarjeta de un caso en el tablero (con «Mover a…» para quien no puede arrastrar). */
export function CaseCardView({
  card,
  steps,
  onMove,
  dragging = false,
}: {
  card: CaseCard;
  steps: ConsolidationStep[];
  /** Sin permiso de gestión no se ofrece mover. */
  onMove?: (card: CaseCard, stepId: number) => void;
  dragging?: boolean;
}) {
  const { t } = useTranslation('consolidation');
  const stepLabel = useStepLabel();
  return (
    <Card
      withBorder
      radius="md"
      p="sm"
      shadow={dragging ? 'lg' : undefined}
      style={{
        borderLeft: card.overdue ? '3px solid var(--mantine-color-red-6)' : undefined,
        opacity: dragging ? 0.9 : 1,
      }}
    >
      <Stack gap={6}>
        <Group justify="space-between" wrap="nowrap" gap="xs" align="flex-start">
          <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
            <PersonAvatar person={card.person} size={30} />
            <div style={{ minWidth: 0 }}>
              <AnchorLink
                to="/consolidacion/$caseId"
                params={{ caseId: String(card.id) }}
                size="sm"
                fw={600}
                c="var(--mantine-color-text)"
                truncate
                style={{ display: 'block' }}
                // Que el clic en el nombre no inicie un arrastre.
                onPointerDown={(e) => e.stopPropagation()}
              >
                {fullName(card.person)}
              </AnchorLink>
              <Text size="xs" c={card.consolidator ? 'dimmed' : 'orange'} truncate>
                {card.consolidator ? fullName(card.consolidator) : t('board.unassigned')}
              </Text>
            </div>
          </Group>
          {onMove && (
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  aria-label={t('board.moveTo')}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <IconDots size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{t('board.moveTo')}</Menu.Label>
                {steps.map((s) => (
                  <Menu.Item
                    key={s.id}
                    leftSection={<IconArrowsMove size={14} />}
                    disabled={s.id === card.currentStepId}
                    onClick={() => onMove(card, s.id)}
                  >
                    {stepLabel(s)}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
        <DueText dueAt={card.currentStepDueAt} overdue={card.overdue} />
        <Group gap="xs" wrap="nowrap">
          <Progress
            value={card.progress.total ? (card.progress.done / card.progress.total) * 100 : 0}
            size="sm"
            radius="xl"
            style={{ flex: 1 }}
            aria-label={t('board.progress', card.progress)}
          />
          <Text size="xs" c="dimmed">
            {card.progress.done}/{card.progress.total}
          </Text>
        </Group>
        <div onPointerDown={(e) => e.stopPropagation()}>
          <ContactButtons phone={card.person.phone} firstName={card.person.firstName} />
        </div>
      </Stack>
    </Card>
  );
}
