import 'i18next';
import type common from '../locales/es/common.json';

// El español es la fuente de verdad: una clave inexistente es error de TypeScript.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: { common: typeof common };
  }
}
