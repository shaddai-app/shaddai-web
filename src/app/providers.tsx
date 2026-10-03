import '@fontsource-variable/inter';
import '@fontsource/frank-ruhl-libre/500.css';
import '@fontsource/frank-ruhl-libre/700.css';
import '@fontsource/frank-ruhl-libre/800.css';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/spotlight/styles.css';
import '../theme/brand.css';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { QueryClientProvider } from '@tanstack/react-query';
import { useMemo, type ReactNode } from 'react';
import '../i18n';
import { useBranding } from '../theme/branding-store';
import { buildTheme, colorSchemeManager, cssVariablesResolver } from '../theme/theme';
import { queryClient } from './query-client';

export function Providers({ children }: { children: ReactNode }) {
  const primaryColor = useBranding((s) => s.primaryColor);
  const theme = useMemo(() => buildTheme(primaryColor), [primaryColor]);

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider
        theme={theme}
        defaultColorScheme="auto"
        colorSchemeManager={colorSchemeManager}
        cssVariablesResolver={cssVariablesResolver}
      >
        <ModalsProvider>
          <Notifications position="top-right" />
          {children}
        </ModalsProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
}
