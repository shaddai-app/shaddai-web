import 'i18next';
import type admin from '../locales/es/admin.json';
import type auth from '../locales/es/auth.json';
import type common from '../locales/es/common.json';
import type errors from '../locales/es/errors.json';
import type permissions from '../locales/es/permissions.json';
import type people from '../locales/es/people.json';
import type platform from '../locales/es/platform.json';
import type settings from '../locales/es/settings.json';

// El español es la fuente de verdad: una clave inexistente es error de TypeScript.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      auth: typeof auth;
      errors: typeof errors;
      settings: typeof settings;
      admin: typeof admin;
      permissions: typeof permissions;
      platform: typeof platform;
      people: typeof people;
    };
  }
}
