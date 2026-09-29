import { ActionIcon, Box, Group, Loader, Switch, Text } from '@mantine/core';
import { IconTextDecrease, IconTextIncrease, IconX } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { songsApi } from '../../../../../../api/worship';
import { requirePermission } from '../../../../../../auth/guards';
import { FormError } from '../../../../../../components/FormError';
import { KeyControl, SongSheet } from '../../../../../../features/worship/SongSheet';
import { useSheet } from '../../../../../../features/worship/useSheet';
import { stageFontSize } from '../../../../../../features/worship/stage';

// Modo escenario: pantalla completa y oscura, letra grande y en columnas en pantallas anchas
// (tablet horizontal), sin que se apague la pantalla.
export const Route = createFileRoute('/_shell/_church/alabanza/canciones/$id/escenario')({
  validateSearch: z.object({ tono: z.coerce.number().int().min(-11).max(11).optional() }),
  beforeLoad: ({ context }) => requirePermission(context.me, 'alabanza.ver'),
  component: StagePage,
});

const FONT_KEY = 'shaddai-stage-font';

/** Mantiene la pantalla encendida mientras la página está visible (si el navegador lo permite). */
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        if (document.visibilityState === 'visible' && 'wakeLock' in navigator) {
          lock = await navigator.wakeLock.request('screen');
        }
      } catch {
        // Sin permiso o sin soporte: la pantalla se apaga como siempre.
      }
    };
    void request();
    document.addEventListener('visibilitychange', request);
    return () => {
      document.removeEventListener('visibilitychange', request);
      void lock?.release().catch(() => undefined);
    };
  }, []);
}

function StagePage() {
  const { t } = useTranslation('worship');
  const id = Number(Route.useParams().id);
  const { tono = 0 } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const query = useQuery({ queryKey: ['songs', 'detail', id], queryFn: () => songsApi.get(id) });
  const [showChords, setShowChords] = useState(true);
  const [fontSize, setFontSize] = useState(() => {
    try {
      return Number(localStorage.getItem(FONT_KEY)) || stageFontSize(window.innerWidth);
    } catch {
      return stageFontSize(window.innerWidth);
    }
  });
  useWakeLock();
  const song = query.data;
  const sheet = useSheet(song?.chordPro, song?.originalKey, tono);
  const setFont = (f: number) => {
    const v = Math.min(48, Math.max(14, f));
    setFontSize(v);
    try {
      localStorage.setItem(FONT_KEY, String(v));
    } catch {
      // Sin almacenamiento: vale solo para esta vez.
    }
  };
  const exit = () =>
    void navigate({
      to: '/alabanza/canciones/$id',
      params: { id: String(id) },
      search: { tono: tono || undefined },
    });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && exit();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <Box
      pos="fixed"
      inset={0}
      bg="#111"
      c="#f1f1f1"
      style={{ zIndex: 300, display: 'flex', flexDirection: 'column' }}
      data-mantine-color-scheme="dark"
    >
      <Group
        justify="space-between"
        wrap="nowrap"
        gap="sm"
        px="md"
        py={6}
        style={{ borderBottom: '1px solid #333', flexShrink: 0 }}
      >
        <Text fw={700} truncate style={{ minWidth: 0 }}>
          {song?.title}
        </Text>
        <Group gap="sm" wrap="nowrap">
          {song && (
            <KeyControl
              originalKey={song.originalKey}
              delta={tono}
              onChange={(d) =>
                void navigate({ search: { tono: ((d % 12) + 12) % 12 || undefined }, replace: true })
              }
              size="md"
            />
          )}
          <Switch
            label={t('chords')}
            checked={showChords}
            onChange={(e) => setShowChords(e.currentTarget.checked)}
            visibleFrom="xs"
          />
          <ActionIcon
            variant="default"
            size="lg"
            onClick={() => setFont(fontSize - 2)}
            aria-label={t('fontSmaller')}
          >
            <IconTextDecrease size={18} />
          </ActionIcon>
          <ActionIcon
            variant="default"
            size="lg"
            onClick={() => setFont(fontSize + 2)}
            aria-label={t('fontBigger')}
          >
            <IconTextIncrease size={18} />
          </ActionIcon>
          <ActionIcon variant="filled" color="gray" size="lg" onClick={exit} aria-label={t('stage.exit')}>
            <IconX size={18} />
          </ActionIcon>
        </Group>
      </Group>
      <Box p="md" style={{ flex: 1, overflow: 'auto' }}>
        {query.isPending ? (
          <Loader />
        ) : query.isError ? (
          <FormError error={query.error} />
        ) : sheet ? (
          <SongSheet sheet={sheet} showChords={showChords} fontSize={fontSize} stage />
        ) : (
          <Text c="dimmed">{t('noChordPro')}</Text>
        )}
      </Box>
    </Box>
  );
}
