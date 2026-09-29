import { ChordLyricsPair, ChordProParser, Tag } from 'chordsheetjs';

// ChordPro → modelo simple para dibujar con React (acordes sobre la letra), con transposición.

export interface SheetPair {
  chord: string;
  lyrics: string;
}
export type SheetLine = { kind: 'lyrics'; pairs: SheetPair[] } | { kind: 'comment'; text: string };
export interface SheetSection {
  /** verse | chorus | bridge | none… (lo que indique ChordPro). */
  type: string;
  label: string | null;
  lines: SheetLine[];
}
export interface Sheet {
  title: string | null;
  sections: SheetSection[];
}

const NOTES: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};
/** Tonalidades que se escriben con bemoles (mayores y relativas menores). */
const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm']);

/** Las 12 tonalidades mayores y menores, como se ofrecen en el selector. */
export const MAJOR_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
export const MINOR_KEYS = ['Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm'];

function splitKey(key: string) {
  const m = /^([A-G](?:#|b)?)(m?)$/.exec(key.trim());
  if (!m || NOTES[m[1]!] === undefined) return null;
  return { root: NOTES[m[1]!]!, minor: m[2] === 'm' };
}

/** La tonalidad que resulta de subir `delta` semitonos, con la grafía habitual (Bb y no A#). */
export function transposeKey(key: string, delta: number): string | null {
  const k = splitKey(key);
  if (!k) return null;
  const root = (((k.root + delta) % 12) + 12) % 12;
  const list = k.minor ? MINOR_KEYS : MAJOR_KEYS;
  return list.find((x) => splitKey(x)!.root === root) ?? null;
}

/** Semitonos de `from` a `to`, por el camino más corto (−5 … +6). */
export function semitonesBetween(from: string, to: string): number {
  const a = splitKey(from);
  const b = splitKey(to);
  if (!a || !b) return 0;
  const d = (((b.root - a.root) % 12) + 12) % 12;
  return d > 6 ? d - 12 : d;
}

/** Normaliza un semitono a −5 … +6 (para mostrar "+2" o "−3"). */
export const normalizeDelta = (d: number) => {
  const x = ((d % 12) + 12) % 12;
  return x > 6 ? x - 12 : x;
};

const accidentalFor = (key: string | null) => (key && FLAT_KEYS.has(key) ? 'b' : '#');

/**
 * Interpreta el ChordPro y lo transpone `delta` semitonos. `key` es la tonalidad original: define si
 * los acordes resultantes se escriben con sostenidos o bemoles.
 */
export function parseSheet(text: string, delta = 0, key: string | null = null): Sheet {
  let song = new ChordProParser().parse(text.replace(/\r\n/g, '\n'), { chopFirstWord: false });
  if (delta !== 0) {
    const target = key ? transposeKey(key, delta) : null;
    song = song.transpose(delta, { accidental: accidentalFor(target) });
  }
  const sections: SheetSection[] = [];
  // Una sección por tramo de líneas del mismo tipo (un párrafo puede mezclar un comentario y el
  // estribillo si no hay línea en blanco entre ellos).
  for (const paragraph of song.bodyParagraphs) {
    let current: SheetSection | null = null;
    for (const line of paragraph.lines) {
      const delimiter = line.items.find((i): i is Tag => i instanceof Tag && i.isSectionDelimiter());
      if (!current || current.type !== line.type || (delimiter && delimiter.label)) {
        current = { type: line.type, label: delimiter?.label || null, lines: [] };
        sections.push(current);
      }
      const comment = line.items.find((i): i is Tag => i instanceof Tag && i.isComment());
      if (comment) {
        current.lines.push({ kind: 'comment', text: comment.value });
        continue;
      }
      const pairs = line.items
        .filter((i): i is ChordLyricsPair => i instanceof ChordLyricsPair)
        .map((p) => ({ chord: p.chords ?? '', lyrics: p.lyrics ?? '' }))
        .filter((p) => p.chord || p.lyrics);
      if (pairs.length) current.lines.push({ kind: 'lyrics', pairs });
    }
  }
  return { title: song.title ?? null, sections: sections.filter((s) => s.lines.length) };
}

/** Solo la letra (sin acordes), para proyectar o compartir. */
export const lyricsOf = (sheet: Sheet) =>
  sheet.sections
    .map((s) =>
      s.lines
        .filter((l) => l.kind === 'lyrics')
        .map((l) => (l.kind === 'lyrics' ? l.pairs.map((p) => p.lyrics).join('') : ''))
        .join('\n'),
    )
    .join('\n\n');
