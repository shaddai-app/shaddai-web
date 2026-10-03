import { describe, expect, it } from 'vitest';
import en from '../../locales/en/legal.json';
import es from '../../locales/es/legal.json';
import pt from '../../locales/pt/legal.json';
import { LEGAL_SECTIONS } from './constants';

describe('textos legales', () => {
  it('cada sección tiene título y texto en los tres idiomas', () => {
    for (const [lang, texts] of Object.entries({ es, en, pt })) {
      for (const doc of ['privacy', 'terms'] as const) {
        const sections = texts[doc].sections as Record<string, { title: string; body: string }>;
        expect(Object.keys(sections).sort(), `${lang}.${doc}`).toEqual([...LEGAL_SECTIONS[doc]].sort());
        for (const key of LEGAL_SECTIONS[doc]) {
          expect(sections[key]!.title.length, `${lang}.${doc}.${key}`).toBeGreaterThan(3);
          expect(sections[key]!.body.length, `${lang}.${doc}.${key}`).toBeGreaterThan(40);
        }
      }
    }
  });

  it('el contacto aparece donde se ejercen los derechos', () => {
    for (const texts of [es, en, pt]) expect(texts.privacy.sections.rights.body).toContain('{{email}}');
  });
});
