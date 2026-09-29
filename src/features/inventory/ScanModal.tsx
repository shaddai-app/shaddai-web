import { Alert, Modal, Stack, Text } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { detectorCtor, qrTokenFrom } from './common';

// Lector de QR con la cámara usando BarcodeDetector (Chrome/Edge en Android y escritorio). Donde no
// existe (Safari), el botón no se muestra: la cámara del sistema ya abre el enlace de la etiqueta.

function Scanner({ onToken }: { onToken: (token: string) => void }) {
  const { t } = useTranslation('inventory');
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<'camera' | 'notInventory' | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let stopped = false;
    const Ctor = detectorCtor()!;
    const detector = new Ctor({ formats: ['qr_code'] });
    const tick = async () => {
      if (stopped || !video.current) return;
      try {
        const codes = await detector.detect(video.current);
        for (const c of codes) {
          const token = qrTokenFrom(c.rawValue);
          if (token) {
            stopped = true;
            onToken(token);
            return;
          }
          setError('notInventory');
        }
      } catch {
        // el video todavía no tiene imagen: se reintenta
      }
      timer = window.setTimeout(() => void tick(), 250);
    };
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(async (s) => {
        stream = s;
        if (stopped || !video.current) return;
        video.current.srcObject = s;
        await video.current.play();
        void tick();
      })
      .catch(() => setError('camera'));
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onToken]);

  return (
    <Stack gap="sm">
      {error === 'camera' ? (
        <Alert color="red">{t('scan.cameraError')}</Alert>
      ) : (
        <>
          <video
            ref={video}
            muted
            playsInline
            style={{
              width: '100%',
              borderRadius: 12,
              background: '#000',
              aspectRatio: '1 / 1',
              objectFit: 'cover',
            }}
          />
          <Text size="sm" c={error ? 'orange' : 'dimmed'} ta="center">
            {error === 'notInventory' ? t('scan.notInventory') : t('scan.hint')}
          </Text>
        </>
      )}
    </Stack>
  );
}

export function ScanModal({
  opened,
  onClose,
  onToken,
}: {
  opened: boolean;
  onClose: () => void;
  onToken: (token: string) => void;
}) {
  const { t } = useTranslation('inventory');
  return (
    <Modal opened={opened} onClose={onClose} title={t('scan.title')} radius="lg">
      {opened && <Scanner onToken={onToken} />}
    </Modal>
  );
}
