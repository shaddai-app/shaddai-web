import { Button, Card, CopyButton, Group, Image, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconCopy, IconDownload, IconExternalLink } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { useTranslation } from 'react-i18next';
import { saveBlob } from '../../api/people';

/**
 * Enlace y QR de un formulario público de la iglesia: por defecto el «Soy nuevo»; con `path`, otro
 * (por ejemplo, el de oración), con su propio título y explicación.
 */
export function ShareFormCard({
  slug,
  path = 'nuevo',
  title,
  body,
  openLabel,
}: {
  slug: string;
  path?: string;
  title?: string;
  body?: string;
  openLabel?: string;
}) {
  const { t } = useTranslation('people');
  const url = `${window.location.origin}/${path}/${slug}`;
  const qr = useQuery({
    queryKey: ['qr', url],
    queryFn: () => QRCode.toDataURL(url, { width: 640, margin: 2, errorCorrectionLevel: 'M' }),
    staleTime: Infinity,
  });

  const download = async () => {
    if (!qr.data) return;
    saveBlob(
      await (await fetch(qr.data)).blob(),
      path === 'nuevo' ? `qr-${slug}.png` : `qr-${path}-${slug}.png`,
    );
  };

  return (
    <Card withBorder radius="lg">
      <Group align="flex-start" wrap="wrap" gap="lg">
        {qr.data && (
          <Image
            src={qr.data}
            alt={title ?? t('newcomers.share.title')}
            w={148}
            h={148}
            radius="md"
            bg="white"
            style={{ flexShrink: 0 }}
          />
        )}
        <Stack gap="xs" style={{ flex: '1 1 260px' }}>
          <Title order={2} size="h5">
            {title ?? t('newcomers.share.title')}
          </Title>
          <Text size="sm" c="dimmed">
            {body ?? t('newcomers.share.body')}
          </Text>
          <TextInput
            value={url}
            readOnly
            aria-label={title ?? t('newcomers.share.title')}
            onFocus={(e) => e.currentTarget.select()}
          />
          <Group gap="xs">
            <CopyButton value={url}>
              {({ copied, copy }) => (
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconCopy size={14} />}
                  onClick={copy}
                  color={copied ? 'teal' : undefined}
                >
                  {copied ? t('newcomers.share.copied') : t('newcomers.share.copy')}
                </Button>
              )}
            </CopyButton>
            <Button
              size="xs"
              variant="default"
              leftSection={<IconDownload size={14} />}
              onClick={() => void download()}
            >
              {t('newcomers.share.download')}
            </Button>
            <Button
              size="xs"
              variant="subtle"
              component="a"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              leftSection={<IconExternalLink size={14} />}
            >
              {openLabel ?? t('newcomers.share.open')}
            </Button>
          </Group>
        </Stack>
      </Group>
    </Card>
  );
}
