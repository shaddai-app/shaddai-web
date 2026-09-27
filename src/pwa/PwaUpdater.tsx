import { Affix, Button, Group, Paper, Text } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useRegisterSW } from 'virtual:pwa-register/react';

const HOUR = 60 * 60 * 1000;

/**
 * Registra el service worker y avisa cuando hay una versión nueva. No se recarga sola: el usuario
 * elige el momento (puede estar a mitad de un reporte).
 */
export function PwaUpdater() {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Las pestañas que quedan abiertas días (PWA instalada) buscan versiones nuevas cada hora.
      if (registration) window.setInterval(() => void registration.update(), HOUR);
    },
  });

  if (!needRefresh) return null;
  return (
    // Por encima de la barra inferior del celular.
    <Affix position={{ bottom: 88, right: 16 }} zIndex={300}>
      <Paper withBorder shadow="md" radius="lg" p="sm" maw={340}>
        <Text size="sm" fw={500}>
          {t('pwa.updateTitle')}
        </Text>
        <Text size="xs" c="dimmed" mb="xs">
          {t('pwa.updateBody')}
        </Text>
        <Group gap="xs" justify="flex-end">
          <Button variant="subtle" color="gray" size="xs" onClick={() => setNeedRefresh(false)}>
            {t('pwa.later')}
          </Button>
          <Button
            size="xs"
            leftSection={<IconRefresh size={14} />}
            onClick={() => void updateServiceWorker(true)}
          >
            {t('pwa.update')}
          </Button>
        </Group>
      </Paper>
    </Affix>
  );
}
