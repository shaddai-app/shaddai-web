import '@fontsource-variable/inter';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/spotlight/styles.css';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { QueryClientProvider } from '@tanstack/react-query';
import { useMemo, type ReactNode } from 'react';
import '../i18n';
import { useBranding } from '../theme/branding-store';
import { buildTheme, colorSchemeManager } from '../theme/theme';
import { queryClient } from './query-client';

export function Providers({ children }: { children: ReactNode }) {
  const primaryColor = useBranding((s) => s.primaryColor);
  const theme = useMemo(() => buildTheme(primaryColor), [primaryColor]);

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="auto" colorSchemeManager={colorSchemeManager}>
        <ModalsProvider>
          <Notifications position="top-right" />
          {children}
        </ModalsProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
}
