import {
  ActionIcon,
  Anchor,
  Button,
  UnstyledButton,
  type ActionIconProps,
  type AnchorProps,
  type ButtonProps,
  type UnstyledButtonProps,
} from '@mantine/core';
import { createLink } from '@tanstack/react-router';
import type { ComponentPropsWithRef } from 'react';

// Componentes de Mantine como <Link> tipados del router (component={Link} pierde el tipado de params).

function MantineAnchor(props: AnchorProps & ComponentPropsWithRef<'a'>) {
  return <Anchor {...props} />;
}

function MantineUnstyledAnchor(props: UnstyledButtonProps & ComponentPropsWithRef<'a'>) {
  return <UnstyledButton component="a" {...props} />;
}

function MantineButtonAnchor(props: ButtonProps & ComponentPropsWithRef<'a'>) {
  return <Button component="a" {...props} />;
}

function MantineActionIconAnchor(props: ActionIconProps & ComponentPropsWithRef<'a'>) {
  return <ActionIcon component="a" {...props} />;
}

export const AnchorLink = createLink(MantineAnchor);
export const UnstyledLink = createLink(MantineUnstyledAnchor);
/** Botón que navega (ej. una acción principal que abre otra pantalla). */
export const ButtonLink = createLink(MantineButtonAnchor);
/** Ícono que navega (ej. abrir el modo escenario de una canción de la lista). */
export const ActionIconLink = createLink(MantineActionIconAnchor);
