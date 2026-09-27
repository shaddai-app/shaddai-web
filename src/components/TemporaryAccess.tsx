import { Button, Code, CopyButton, Group, Stack, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import i18n from '../i18n';

function row(label: string, value: string) {
  return (
    <Stack gap={4}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Group gap="xs" wrap="nowrap">
        <Code fz="md" py={6} style={{ flex: 1, wordBreak: 'break-all' }}>
          {value}
        </Code>
        <CopyButton value={value}>
          {({ copied, copy }) => (
            <Button size="xs" variant="light" onClick={copy} miw={80}>
              {copied ? i18n.t('common:actions.copied') : i18n.t('common:actions.copy')}
            </Button>
          )}
        </CopyButton>
      </Group>
    </Stack>
  );
}

/**
 * Muestra UNA vez la contraseña temporal devuelta por la API. No se guarda en ningún lado:
 * al cerrar el modal desaparece.
 */
export function showTemporaryAccess(args: { title: string; name: string; email: string; password: string }) {
  const id = modals.open({
    title: args.title,
    closeOnClickOutside: false,
    children: (
      <Stack gap="md">
        <Text size="sm">{i18n.t('admin:users.access.body', { name: args.name })}</Text>
        {row(i18n.t('admin:users.access.email'), args.email)}
        {row(i18n.t('admin:users.access.password'), args.password)}
        <Button onClick={() => modals.close(id)}>{i18n.t('admin:users.access.done')}</Button>
      </Stack>
    ),
  });
}
