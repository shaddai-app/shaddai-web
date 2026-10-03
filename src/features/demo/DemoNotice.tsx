import { Alert, Text } from '@mantine/core';
import { IconFlask, IconLock } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { Me } from '../../api/types';

/** Franja fija para todos los usuarios de la iglesia demo (cuenta pública que se restablece a diario). */
export function DemoBanner({ me }: { me: Me }) {
  const { t } = useTranslation();
  if (!me.account?.isDemo) return null;
  return (
    <Alert
      variant="light"
      radius="md"
      py={4}
      mb="md"
      icon={<IconFlask size={16} />}
      role="status"
      styles={{
        root: { background: 'var(--sh-superficie-sutil)', border: '1px solid var(--sh-borde)' },
        message: { color: 'var(--sh-texto-2)' },
        icon: { color: 'var(--sh-detalle)' },
      }}
    >
      <Text size="xs" lineClamp={2}>
        {t('demo.banner')}
      </Text>
    </Alert>
  );
}

/** En lugar de una acción bloqueada en la demo (seguridad, facturación, exportación, baja). */
export function DemoBlocked({ what }: { what: 'security' | 'billing' | 'export' | 'closure' }) {
  const { t } = useTranslation();
  return (
    <Alert color="grape" variant="light" icon={<IconLock size={18} />}>
      {t(`demo.blocked.${what}`)}
    </Alert>
  );
}
