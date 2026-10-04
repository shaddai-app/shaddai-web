import { ActionIcon, Badge, Button, Group, Menu, Paper, Spoiler, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCircleCheck,
  IconDots,
  IconPencil,
  IconPray,
  IconRotateClockwise,
  IconTrash,
} from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { prayerApi, type PrayerRequest } from '../../api/prayer';
import { AnchorLink } from '../../components/links';
import { errorMessage } from '../../i18n/errors';
import { ContactBadge } from './RequesterCard';

const textStyle = { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } as const;

/**
 * Una petición: quién la pide (o "Anónima"), a quién va, el texto, el testimonio si fue respondida y
 * el botón "Estoy orando". El menú tiene las acciones del autor y, para los pastores, borrar.
 */
export function PrayerItem({
  p,
  full,
  canModerate,
  onEdit,
  onAnswer,
  onReopen,
  onDelete,
}: {
  p: PrayerRequest;
  /** En el detalle se muestra entera; en las listas, recortada con "ver más". */
  full?: boolean;
  canModerate: boolean;
  onEdit: () => void;
  onAnswer: () => void;
  onReopen: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation('prayer');
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const answered = p.status === 'answered';
  const date = dayjs(p.createdAt).format('L');

  const togglePraying = async () => {
    setBusy(true);
    try {
      await (p.praying ? prayerApi.unpray(p.id) : prayerApi.pray(p.id));
      await queryClient.invalidateQueries({ queryKey: ['prayer'] });
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const text = (
    <Text size="sm" style={textStyle}>
      {p.body}
    </Text>
  );
  const actions = p.mine || canModerate;

  return (
    <Stack gap={8}>
      <Group justify="space-between" wrap="nowrap" align="flex-start" gap="xs">
        <div style={{ minWidth: 0 }}>
          <Text fw={600} fs={p.author ? undefined : 'italic'}>
            {p.author ? p.author.name : p.requester ? t('requester.noName') : t('anonymous')}
          </Text>
          <Text size="xs" c="dimmed">
            {full ? (
              date
            ) : (
              <AnchorLink to="/oracion/$id" params={{ id: String(p.id) }} c="dimmed" size="xs">
                {date}
              </AnchorLink>
            )}
          </Text>
        </div>
        {actions && (
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon variant="subtle" aria-label={t('actions')}>
                <IconDots size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {p.mine && !answered && (
                <Menu.Item leftSection={<IconCircleCheck size={16} />} onClick={onAnswer}>
                  {t('markAnswered')}
                </Menu.Item>
              )}
              {p.mine && answered && (
                <Menu.Item leftSection={<IconRotateClockwise size={16} />} onClick={onReopen}>
                  {t('reopen')}
                </Menu.Item>
              )}
              {p.mine && (
                <Menu.Item leftSection={<IconPencil size={16} />} onClick={onEdit}>
                  {t('edit')}
                </Menu.Item>
              )}
              <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={onDelete}>
                {t('delete')}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>

      {(answered || p.visibility !== 'public' || (p.mine && p.anonymous) || p.source === 'form') && (
        <Group gap={6}>
          {p.source === 'form' && (
            <Badge size="sm" variant="light" color="gray">
              {t('badge.form')}
            </Badge>
          )}
          {p.requester && <ContactBadge requester={p.requester} />}
          {answered && (
            <Badge size="sm" variant="light" color="teal">
              {t('answered')}
            </Badge>
          )}
          {p.visibility !== 'public' && (
            <Badge size="sm" variant="light" color="marfil">
              {t(`badge.${p.visibility}`)}
            </Badge>
          )}
          {p.mine && p.anonymous && (
            <Badge size="sm" variant="light" color="gray">
              {t('badge.anonymous')}
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

      {answered && p.testimony && (
        <Paper withBorder radius="md" p="sm" bg="var(--mantine-color-teal-light)">
          <Text size="xs" fw={600} c="teal" mb={4}>
            {t('testimony')}
          </Text>
          <Text size="sm" style={textStyle}>
            {p.testimony}
          </Text>
        </Paper>
      )}

      <Group gap="sm" wrap="wrap">
        {!answered && (
          <Button
            size="xs"
            variant={p.praying ? 'filled' : 'light'}
            leftSection={<IconPray size={16} />}
            loading={busy}
            onClick={togglePraying}
            aria-pressed={p.praying}
          >
            {p.praying ? t('praying') : t('pray')}
          </Button>
        )}
        {p.prayerCount > 0 && (
          <Text size="xs" c="dimmed">
            {answered
              ? t('prayedCount', { count: p.prayerCount })
              : t('prayingCount', { count: p.prayerCount })}
          </Text>
        )}
        {!full && p.replyCount > 0 && (
          <AnchorLink to="/oracion/$id" params={{ id: String(p.id) }} size="xs">
            {t('replies.count', { count: p.replyCount })}
          </AnchorLink>
        )}
      </Group>
    </Stack>
  );
}
