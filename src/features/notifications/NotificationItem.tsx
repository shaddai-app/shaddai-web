import { Box, Group, Text, UnstyledButton } from '@mantine/core';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { notificationsApi, type AppNotification } from '../../api/notifications';
import { useNotificationText, when } from './text';

/** Un aviso: al tocarlo se marca como leído y abre su enlace. */
export function NotificationItem({ n, onOpen }: { n: AppNotification; onOpen?: () => void }) {
  const text = useNotificationText();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { title, body } = text(n);
  const unread = n.readAt === null;
  const open = async () => {
    onOpen?.();
    if (unread) {
      await notificationsApi.markRead(n.id).catch(() => undefined);
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
    if (n.link) router.history.push(n.link);
  };
  return (
    <UnstyledButton
      onClick={() => void open()}
      w="100%"
      px="md"
      py="sm"
      style={{ display: 'block' }}
      bg={unread ? 'var(--mantine-primary-color-light)' : undefined}
    >
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <Box
          mt={7}
          w={8}
          h={8}
          style={{
            borderRadius: '50%',
            flexShrink: 0,
            background: unread ? 'var(--mantine-primary-color-filled)' : 'transparent',
          }}
          aria-hidden
        />
        <div style={{ minWidth: 0 }}>
          <Text size="sm" fw={unread ? 600 : 500}>
            {title}
          </Text>
          {body && (
            <Text size="sm" c="dimmed" lineClamp={3}>
              {body}
            </Text>
          )}
          <Text size="xs" c="dimmed" mt={2}>
            {when(n.createdAt)}
          </Text>
        </div>
      </Group>
    </UnstyledButton>
  );
}
