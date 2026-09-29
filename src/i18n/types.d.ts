import 'i18next';
import type admin from '../locales/es/admin.json';
import type auth from '../locales/es/auth.json';
import type cells from '../locales/es/cells.json';
import type calendar from '../locales/es/calendar.json';
import type ministries from '../locales/es/ministries.json';
import type finance from '../locales/es/finance.json';
import type consolidation from '../locales/es/consolidation.json';
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
      cells: typeof cells;
      consolidation: typeof consolidation;
      finance: typeof finance;
      calendar: typeof calendar;
      ministries: typeof ministries;
    };
  }
}
