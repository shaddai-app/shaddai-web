import { Button, Menu, Stack, Text, type ButtonProps } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconChevronDown } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEMO_ROLES, landingApi, type DemoRole } from '../../api/landing';
import { homePath } from '../../auth/guards';
import { applyNewToken } from '../../auth/session';
import { errorMessage } from '../../i18n/errors';

/** "Probar la demo": elige uno de los 4 perfiles de la iglesia demo y entra sin contraseña. */
export function DemoMenu(props: ButtonProps) {
  const { t } = useTranslation('landing');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<DemoRole | null>(null);

  const enter = async (role: DemoRole) => {
    setBusy(role);
    try {
      const res = await landingApi.demo(role);
      const me = await applyNewToken(queryClient, res.accessToken);
      await navigate({ to: homePath(me) });
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
      setBusy(null);
    }
  };

  return (
    <Menu position="bottom-start" width={280} withinPortal>
      <Menu.Target>
        <Button rightSection={<IconChevronDown size={16} />} loading={busy !== null} {...props}>
          {t('demo.cta')}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{t('demo.menuTitle')}</Menu.Label>
        {DEMO_ROLES.map((role) => (
          <Menu.Item key={role} onClick={() => void enter(role)} py="xs">
            <Stack gap={0}>
              <Text size="sm" fw={600}>
                {t(`demo.roles.${role}.title`)}
              </Text>
              <Text size="xs" c="dimmed">
                {t(`demo.roles.${role}.body`)}
              </Text>
            </Stack>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
