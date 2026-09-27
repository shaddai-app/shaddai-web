import { Modal, type ModalProps } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';

/** Modal que en el celular ocupa toda la pantalla (formularios cómodos con el teclado abierto). */
export function ResponsiveModal(props: ModalProps) {
  const mobile = useMediaQuery('(max-width: 48em)');
  return <Modal size="lg" fullScreen={mobile} radius={mobile ? 0 : 'lg'} {...props} />;
}
