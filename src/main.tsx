import { Center, Loader } from '@mantine/core';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { Providers } from './app/providers';
import { queryClient } from './app/query-client';
import { PageLoader } from './routes/__root';
import { routeTree } from './routeTree.gen';

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPendingComponent: PageLoader,
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      {/* Suspense: espera la carga de las traducciones del idioma actual. */}
      <Suspense
        fallback={
          <Center mih="100dvh">
            <Loader />
          </Center>
        }
      >
        <RouterProvider router={router} />
      </Suspense>
    </Providers>
  </StrictMode>,
);
