import { createFileRoute } from '@tanstack/react-router';
import { LegalPage } from '../features/legal/LegalPage';

// Pública: se puede leer sin sesión (enlazada desde el login y los formularios públicos).
export const Route = createFileRoute('/privacidad')({
  component: () => <LegalPage doc="privacy" />,
});
