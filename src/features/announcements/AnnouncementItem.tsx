import { ActionIcon, Badge, Group, Menu, Spoiler, Stack, Text } from '@mantine/core';
import { IconDots, IconPencil, IconPin, IconTrash } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { Announcement } from '../../api/announcements';
import { AnchorLink } from '../../components/links';

/** Un anuncio: título, autor y fecha, texto (recortado en las listas) y acciones para quien gestiona. */
export function AnnouncementItem({
  a,
  full,
  onEdit,
  onDelete,
  audienceLabel,
}: {
  a: Announcement;
  /** En el detalle se muestra entero; en las listas, recortado con "ver más". */
  full?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Para quien gestiona: a quién va dirigido. */
  audienceLabel?: string;
}) {
  const { t } = useTranslation('announcements');
  const scheduled = dayjs(a.publishAt).isAfter(dayjs());
  const text = (
    <Text size="sm" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
      {a.body}
    </Text>
  );
  return (
    <Stack gap={6}>
      <Group justify="space-between" wrap="nowrap" align="flex-start" gap="xs">
        <div style={{ minWidth: 0 }}>
          <Group gap={6} wrap="nowrap">
            {a.pinned && <IconPin size={16} aria-label={t('pinned')} style={{ flexShrink: 0 }} />}
            {full ? (
              <Text fw={600}>{a.title}</Text>
            ) : (
              <AnchorLink to="/anuncios/$id" params={{ id: String(a.id) }} fw={600} c="inherit">
                {a.title}
              </AnchorLink>
            )}
          </Group>
          <Text size="xs" c="dimmed">
            {a.author.name} · {dayjs(a.publishAt).format('L LT')}
            {a.expiresAt ? ` · ${t('until', { date: dayjs(a.expiresAt).format('L') })}` : ''}
          </Text>
        </div>
        {(onEdit || onDelete) && (
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon variant="subtle" aria-label={t('actions')}>
                <IconDots size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {onEdit && (
                <Menu.Item leftSection={<IconPencil size={16} />} onClick={onEdit}>
                  {t('edit')}
                </Menu.Item>
              )}
              {onDelete && (
                <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={onDelete}>
                  {t('delete')}
                </Menu.Item>
              )}
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>
      {(scheduled || audienceLabel) && (
        <Group gap={6}>
          {scheduled && (
            <Badge size="sm" variant="light" color="grape">
              {t('scheduledFor', { date: dayjs(a.publishAt).format('L LT') })}
            </Badge>
          )}
          {audienceLabel && (
            <Badge size="sm" variant="light" color="gray">
              {audienceLabel}
            </Badge>
          )}
        </Group>
      )}
      {full ? (
        text
      ) : (
        <Spoiler maxHeight={88} showLabel={t('more')} hideLabel={t('less')}>
          {text}
        </Spoiler>
      )}
    </Stack>
  );
}
