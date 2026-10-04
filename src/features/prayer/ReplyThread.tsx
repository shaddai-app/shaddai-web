import { Button, Group, Paper, Stack, Text, Textarea } from '@mantine/core';
import { IconSend } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PrayerReply } from '../../api/prayer';
import { FormError } from '../../components/FormError';

const textStyle = { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } as const;

/**
 * Conversación de una petición entre quien la pidió y el equipo que la atiende. `side` dice desde
 * dónde se mira: quien pidió (su enlace) ve a la derecha lo suyo; el equipo, lo que escribió cada uno.
 */
export function ReplyThread({
  replies,
  side,
  onSend,
  disabled,
}: {
  replies: PrayerReply[];
  side: 'requester' | 'team';
  onSend: (body: string) => Promise<unknown>;
  disabled?: boolean;
}) {
  const { t } = useTranslation('prayer');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setError(null);
    try {
      await onSend(body);
      setDraft('');
    } catch (err) {
      // Lo escrito queda en la caja: con mala señal se reintenta sin volver a tipear.
      setError(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <Stack gap="sm">
      {replies.length === 0 ? (
        <Text size="sm" c="dimmed">
          {side === 'requester' ? t('replies.emptyRequester') : t('replies.empty')}
        </Text>
      ) : (
        replies.map((r) => {
          const own = side === 'requester' ? r.fromRequester : r.mine;
          const who = own
            ? t('replies.you')
            : (r.author ?? (r.fromRequester ? t('replies.requester') : t('replies.church')));
          return (
            <Paper
              key={r.id}
              radius="md"
              p="sm"
              withBorder={!own}
              bg={own ? 'var(--mantine-primary-color-light)' : 'var(--sh-superficie)'}
              ml={own ? 'xl' : 0}
              mr={own ? 0 : 'xl'}
            >
              <Group justify="space-between" gap="xs" wrap="nowrap" mb={4}>
                <Text size="xs" fw={600} truncate>
                  {who}
                </Text>
                <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                  {dayjs(r.createdAt).format('L LT')}
                </Text>
              </Group>
              <Text size="sm" style={textStyle}>
                {r.body}
              </Text>
            </Paper>
          );
        })
      )}
      {!disabled && (
        <Stack gap="xs">
          <FormError error={error} />
          <Textarea
            aria-label={t('replies.write')}
            placeholder={side === 'requester' ? t('replies.placeholderRequester') : t('replies.placeholder')}
            autosize
            minRows={2}
            maxLength={1000}
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button
              leftSection={<IconSend size={16} />}
              loading={sending}
              disabled={!draft.trim()}
              onClick={() => void send()}
            >
              {t('replies.send')}
            </Button>
          </Group>
        </Stack>
      )}
    </Stack>
  );
}
