import { ActionIcon, Menu, Tooltip } from '@mantine/core';
import { IconCheck, IconLanguage } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { usePersistPreference } from '../auth/use-preferences';
import { LANGUAGES } from '../i18n';

export function LanguageMenu() {
  const { t, i18n } = useTranslation();
  const persist = usePersistPreference();
  const current = i18n.resolvedLanguage;

  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <Tooltip label={t('language.label')}>
          <ActionIcon aria-label={t('language.label')}>
            <IconLanguage size={20} stroke={1.6} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown>
        {LANGUAGES.map((lng) => (
          <Menu.Item
            key={lng}
            onClick={() => {
              void i18n.changeLanguage(lng);
              void persist({ locale: lng });
            }}
            rightSection={lng === current ? <IconCheck size={16} /> : null}
          >
            {t(`language.${lng}`)}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
