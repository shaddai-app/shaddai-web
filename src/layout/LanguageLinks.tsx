import { Anchor, Group, Text } from '@mantine/core';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { usePersistPreference } from '../auth/use-preferences';
import { LANGUAGES } from '../i18n';

/** "Español · English · Português" en texto (pie de la landing y panel de marca del login). */
export function LanguageLinks({ c = 'dimmed' }: { c?: string }) {
  const { t, i18n } = useTranslation();
  const persist = usePersistPreference();
  const current = i18n.resolvedLanguage;
  return (
    <Group gap={6} aria-label={t('language.label')} role="group">
      {LANGUAGES.map((lng, i) => (
        <Fragment key={lng}>
          {i > 0 && (
            <Text span size="xs" c={c} aria-hidden>
              ·
            </Text>
          )}
          <Anchor
            component="button"
            type="button"
            size="xs"
            c={c}
            fw={lng === current ? 600 : 400}
            aria-current={lng === current ? 'true' : undefined}
            onClick={() => {
              void i18n.changeLanguage(lng);
              void persist({ locale: lng });
            }}
          >
            {t(`language.${lng}`)}
          </Anchor>
        </Fragment>
      ))}
    </Group>
  );
}
