import { ActionIcon, Tooltip, useMantineColorScheme, type MantineColorScheme } from '@mantine/core';
import { IconDeviceDesktop, IconMoon, IconSun } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

const NEXT: Record<MantineColorScheme, MantineColorScheme> = { light: 'dark', dark: 'auto', auto: 'light' };
const ICONS = { light: IconSun, dark: IconMoon, auto: IconDeviceDesktop } as const;

/** Cicla claro → oscuro → según el sistema. (Fase 1: además persiste en el perfil del usuario.) */
export function ColorSchemeToggle() {
  const { t } = useTranslation();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const Icon = ICONS[colorScheme];
  const label = `${t('theme.label')}: ${t(`theme.${colorScheme}`)}`;

  return (
    <Tooltip label={label}>
      <ActionIcon aria-label={label} onClick={() => setColorScheme(NEXT[colorScheme])}>
        <Icon size={20} stroke={1.6} />
      </ActionIcon>
    </Tooltip>
  );
}
