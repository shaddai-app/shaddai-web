import { Box, Image } from '@mantine/core';
import iconUrl from '../assets/brand/shaddai-icono-color.svg';
import logoUrl from '../assets/brand/shaddai-logo-horizontal-color.svg';
import logoDarkUrl from '../assets/brand/shaddai-logo-horizontal-color-dark.svg';

/** Proporción del logo horizontal del kit (viewBox 407.76 × 108). */
const LOGO_RATIO = 407.76 / 108;

/** Hexágono de Shaddai con la ש (los SVG del kit se usan tal cual: no se redibujan ni recolorean). */
export function ShaddaiIcon({ size = 34 }: { size?: number }) {
  return <Image src={iconUrl} w={size} h={size} alt="" aria-hidden />;
}

/**
 * Logo horizontal. `tone="auto"` sigue el tema (color en claro, -color-dark en oscuro);
 * `tone="dark"` es para fondos Azul noche en cualquier tema.
 */
export function ShaddaiLogo({ height = 32, tone = 'auto' }: { height?: number; tone?: 'auto' | 'dark' }) {
  const size = { h: height, w: height * LOGO_RATIO };
  if (tone === 'dark') return <Image src={logoDarkUrl} {...size} alt="Shaddai" />;
  return (
    <Box component="span" display="inline-flex">
      <Image src={logoUrl} {...size} alt="Shaddai" darkHidden />
      <Image src={logoDarkUrl} {...size} alt="Shaddai" lightHidden />
    </Box>
  );
}
