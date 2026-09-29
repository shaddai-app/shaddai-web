import { ActionIcon, Badge, Box, Group, Select, Text } from '@mantine/core';
import { IconMinus, IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  MAJOR_KEYS,
  MINOR_KEYS,
  normalizeDelta,
  semitonesBetween,
  transposeKey,
  type Sheet,
} from './chordpro';

/**
 * Letra con acordes: cada tramo (acorde + sílabas) es un bloque con el acorde arriba, así el acorde
 * queda sobre su sílaba aunque la línea se parta en pantallas angostas.
 */
export function SongSheet({
  sheet,
  showChords = true,
  fontSize = 16,
  stage = false,
}: {
  sheet: Sheet;
  showChords?: boolean;
  /** En px. */
  fontSize?: number;
  /** Modo escenario: fondo oscuro, columnas en pantallas anchas. */
  stage?: boolean;
}) {
  const { t } = useTranslation('worship');
  const chordColor = stage ? 'var(--mantine-color-yellow-4)' : 'var(--mantine-color-blue-filled)';
  return (
    <Box
      style={{
        fontSize,
        lineHeight: 1.35,
        ...(stage
          ? { columnWidth: `${Math.round(fontSize * 17)}px`, columnGap: '3em', columnFill: 'balance' }
          : {}),
      }}
    >
      {sheet.sections.map((section, si) => (
        <Box
          key={si}
          mb="1em"
          pl={section.type === 'chorus' ? '0.8em' : 0}
          style={{
            breakInside: 'avoid',
            borderLeft: section.type === 'chorus' ? `3px solid ${chordColor}` : undefined,
          }}
        >
          {(section.label || ['chorus', 'bridge'].includes(section.type)) && (
            <Badge
              size="sm"
              variant={stage ? 'filled' : 'light'}
              color={stage ? 'gray' : 'blue'}
              mb={4}
              tt="none"
            >
              {section.label || t(`sections.${section.type as 'chorus' | 'bridge'}`)}
            </Badge>
          )}
          {section.lines.map((line, li) =>
            line.kind === 'comment' ? (
              <Text key={li} fs="italic" c="dimmed" style={{ fontSize: '0.85em' }}>
                {line.text}
              </Text>
            ) : (
              <Box key={li} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                {line.pairs.map((p, pi) => (
                  <Box
                    key={pi}
                    style={{ display: 'inline-flex', flexDirection: 'column', whiteSpace: 'pre' }}
                  >
                    {showChords && line.pairs.some((x) => x.chord) && (
                      <Text
                        component="span"
                        fw={700}
                        style={{
                          color: chordColor,
                          fontSize: '0.9em',
                          minHeight: '1.3em',
                          paddingRight: '0.4em',
                        }}
                      >
                        {p.chord}
                      </Text>
                    )}
                    <span>{p.lyrics || (showChords && p.chord ? ' ' : '')}</span>
                  </Box>
                ))}
              </Box>
            ),
          )}
        </Box>
      ))}
    </Box>
  );
}

/** Tonalidad: − / + semitono y selector de la tonalidad destino. */
export function KeyControl({
  originalKey,
  delta,
  onChange,
  size = 'sm',
}: {
  originalKey: string | null;
  delta: number;
  onChange: (delta: number) => void;
  size?: 'sm' | 'md';
}) {
  const { t } = useTranslation('worship');
  const minor = originalKey?.endsWith('m') ?? false;
  const keys = minor ? MINOR_KEYS : MAJOR_KEYS;
  const shown = normalizeDelta(delta);
  return (
    <Group gap={4} wrap="nowrap">
      <ActionIcon
        variant="default"
        size={size === 'md' ? 'lg' : 'md'}
        onClick={() => onChange(delta - 1)}
        aria-label={t('key.down')}
      >
        <IconMinus size={16} />
      </ActionIcon>
      {originalKey ? (
        <Select
          size={size === 'md' ? 'sm' : 'xs'}
          w={90}
          aria-label={t('key.label')}
          data={keys.map((k) => ({ value: k, label: k === originalKey ? `${k} ★` : k }))}
          value={transposeKey(originalKey, shown) ?? originalKey}
          onChange={(v) => v && onChange(semitonesBetween(originalKey, v))}
          allowDeselect={false}
          comboboxProps={{ withinPortal: true }}
        />
      ) : (
        <Text size="sm" w={48} ta="center">
          {shown > 0 ? `+${shown}` : shown}
        </Text>
      )}
      <ActionIcon
        variant="default"
        size={size === 'md' ? 'lg' : 'md'}
        onClick={() => onChange(delta + 1)}
        aria-label={t('key.up')}
      >
        <IconPlus size={16} />
      </ActionIcon>
    </Group>
  );
}
