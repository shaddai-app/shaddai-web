import { Alert, Group, Text } from '@mantine/core';
import { IconFlask, IconLock } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { Me } from '../../api/types';

/** Franja fija para todos los usuarios de la iglesia demo (cuenta pública que se restablece a diario). */
export function DemoBanner({ me }: { me: Me }) {
  const { t } = useTranslation();
  if (!me.account?.isDemo) return null;
  return (
    // Ícono y texto centrados en la misma línea (el Alert de Mantine alinea el ícono arriba).
    <Group
      gap="xs"
      wrap="nowrap"
      align="center"
      mb="md"
      px="sm"
      py={6}
      role="status"
      bg="var(--sh-marfil-bg)"
      c="var(--sh-marfil-texto)"
      style={{ border: '1px solid var(--sh-marfil-borde)', borderRadius: 'var(--mantine-radius-md)' }}
    >
      <IconFlask size={16} style={{ flexShrink: 0 }} aria-hidden />
      <Text size="xs" lineClamp={2}>
        {t('demo.banner')}
      </Text>
    </Group>
  );
}

/** En lugar de una acción bloqueada en la demo (seguridad, facturación, exportación, baja). */
export function DemoBlocked({ what }: { what: 'security' | 'billing' | 'export' | 'closure' }) {
  const { t } = useTranslation();
  return (
    <Alert color="marfil" variant="light" icon={<IconLock size={18} />}>
      {t(`demo.blocked.${what}`)}
    </Alert>
  );
}
