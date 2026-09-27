import { Anchor, UnstyledButton, type AnchorProps, type UnstyledButtonProps } from '@mantine/core';
import { createLink } from '@tanstack/react-router';
import type { ComponentPropsWithRef } from 'react';

// Componentes de Mantine como <Link> tipados del router (component={Link} pierde el tipado de params).

function MantineAnchor(props: AnchorProps & ComponentPropsWithRef<'a'>) {
  return <Anchor {...props} />;
}

function MantineUnstyledAnchor(props: UnstyledButtonProps & ComponentPropsWithRef<'a'>) {
  return <UnstyledButton component="a" {...props} />;
}

export const AnchorLink = createLink(MantineAnchor);
export const UnstyledLink = createLink(MantineUnstyledAnchor);
