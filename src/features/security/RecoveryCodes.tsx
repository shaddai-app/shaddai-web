import { Alert, Button, Checkbox, CopyButton, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconCopy, IconDownload, IconKey } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { saveBlob } from '../../api/people';

/**
 * Códigos de recuperación recién generados: se ven UNA sola vez. Para seguir hay que confirmar que
 * se guardaron (copiados, descargados o anotados).
 */
export function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const { t } = useTranslation(['settings', 'common']);
  const [saved, setSaved] = useState(false);
  const text = codes.join('\n');

  return (
    <Stack gap="md">
      <Alert color="yellow" icon={<IconKey size={18} />}>
        {t('twoFactor.codes.warning')}
      </Alert>
      <SimpleGrid cols={2} spacing="xs" verticalSpacing={6}>
        {codes.map((code) => (
          <Text key={code} ff="monospace" fz="md" ta="center" py={4} bg="var(--mantine-color-default-hover)">
            {code}
          </Text>
        ))}
      </SimpleGrid>
      <Group grow>
        <CopyButton value={text}>
          {({ copied, copy }) => (
            <Button variant="light" leftSection={<IconCopy size={16} />} onClick={copy}>
              {copied ? t('common:actions.copied') : t('common:actions.copy')}
            </Button>
          )}
        </CopyButton>
        <Button
          variant="light"
          leftSection={<IconDownload size={16} />}
          onClick={() =>
            saveBlob(
              new Blob([`${t('twoFactor.codes.fileHeader')}\n\n${text}\n`], { type: 'text/plain' }),
              t('twoFactor.codes.fileName'),
            )
          }
        >
          {t('twoFactor.codes.download')}
        </Button>
      </Group>
      <Checkbox
        label={t('twoFactor.codes.saved')}
        checked={saved}
        onChange={(e) => setSaved(e.currentTarget.checked)}
      />
      <Button disabled={!saved} onClick={onDone}>
        {t('twoFactor.codes.done')}
      </Button>
    </Stack>
  );
}
