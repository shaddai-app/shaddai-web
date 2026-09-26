// Verifica que en/pt tengan exactamente las mismas claves que es (fuente de verdad).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = 'src/locales';
const base = 'es';
const others = readdirSync(root).filter((d) => d !== base);

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
const load = (lng, file) => new Set(flatten(JSON.parse(readFileSync(join(root, lng, file), 'utf8'))));

let errors = 0;
for (const file of readdirSync(join(root, base))) {
  const expected = load(base, file);
  for (const lng of others) {
    let actual;
    try {
      actual = load(lng, file);
    } catch {
      console.error(`✖ Falta ${lng}/${file}`);
      errors++;
      continue;
    }
    const report = (msg) => {
      console.error(`✖ ${lng}/${file}: ${msg}`);
      errors++;
    };
    for (const key of expected) if (!actual.has(key)) report(`falta "${key}"`);
    for (const key of actual) if (!expected.has(key)) report(`sobra "${key}"`);
  }
}
if (errors) process.exit(1);
console.log(`✔ Traducciones completas (${[base, ...others].join(', ')})`);
