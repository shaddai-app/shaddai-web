import { describe, expect, it } from 'vitest';
import { lyricsOf, normalizeDelta, parseSheet, semitonesBetween, transposeKey } from './chordpro';

const SONG = [
  '{title: Prueba}',
  '{key: G}',
  '',
  '{start_of_verse: Verso 1}',
  '[G]Cada mañana [D/F#]nueva es tu [Em]luz',
  '{end_of_verse}',
  '',
  '{comment: Todos juntos}',
  '{start_of_chorus}',
  '[C]Canto a tu [G]nombre',
  '{end_of_chorus}',
].join('\n');

const chords = (text: string, delta: number, key: string | null) =>
  parseSheet(text, delta, key).sections.flatMap((s) =>
    s.lines.flatMap((l) => (l.kind === 'lyrics' ? l.pairs.map((p) => p.chord).filter(Boolean) : [])),
  );

describe('ChordPro', () => {
  it('arma secciones con acordes sobre la letra y comentarios', () => {
    const sheet = parseSheet(SONG);
    expect(sheet.title).toBe('Prueba');
    expect(sheet.sections.map((s) => [s.type, s.label])).toEqual([
      ['verse', 'Verso 1'],
      ['none', null],
      ['chorus', null],
    ]);
    expect(sheet.sections[0]!.lines[0]).toEqual({
      kind: 'lyrics',
      pairs: [
        { chord: 'G', lyrics: 'Cada mañana ' },
        { chord: 'D/F#', lyrics: 'nueva es tu ' },
        { chord: 'Em', lyrics: 'luz' },
      ],
    });
    expect(sheet.sections[1]!.lines[0]).toEqual({ kind: 'comment', text: 'Todos juntos' });
    expect(lyricsOf(sheet)).toBe('Cada mañana nueva es tu luz\n\n\n\nCanto a tu nombre');
  });

  it('transpone a otra tonalidad con la grafía correcta', () => {
    expect(chords(SONG, 0, 'G')).toEqual(['G', 'D/F#', 'Em', 'C', 'G']);
    // G → A (+2): sostenidos.
    expect(chords(SONG, 2, 'G')).toEqual(['A', 'E/G#', 'F#m', 'D', 'A']);
    // G → Bb (+3): bemoles.
    expect(chords(SONG, 3, 'G')).toEqual(['Bb', 'F/A', 'Gm', 'Eb', 'Bb']);
    // G → E (−3).
    expect(chords(SONG, -3, 'G')).toEqual(['E', 'B/D#', 'C#m', 'A', 'E']);
  });

  it('tonalidades y distancias', () => {
    expect(transposeKey('G', 3)).toBe('Bb');
    expect(transposeKey('G', -3)).toBe('E');
    expect(transposeKey('Am', 2)).toBe('Bm');
    expect(transposeKey('Em', 1)).toBe('Fm');
    expect(transposeKey('B', 1)).toBe('C');
    expect(transposeKey('H', 1)).toBeNull();
    expect(semitonesBetween('G', 'Eb')).toBe(-4);
    expect(semitonesBetween('G', 'C')).toBe(5);
    expect(semitonesBetween('C', 'F#')).toBe(6);
    expect(normalizeDelta(11)).toBe(-1);
    expect(normalizeDelta(-7)).toBe(5);
  });
});
