import { Group, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { AnchorLink } from '../../components/links';

/** Enlaces a la política de privacidad y los términos, al pie de las pantallas públicas. */
export function LegalLinks() {
  const { t } = useTranslation('legal');
  return (
    <Group justify="center" gap="xs">
      <AnchorLink to="/privacidad" size="xs" c="dimmed">
        {t('links.privacy')}
      </AnchorLink>
      <Text size="xs" c="dimmed" aria-hidden>
        ·
      </Text>
      <AnchorLink to="/terminos" size="xs" c="dimmed">
        {t('links.terms')}
      </AnchorLink>
    </Group>
  );
}
