import { EditorialPauta } from '../types/fortmidia';

const CODE_PREFIX = 'FN-';

export function formatPautaCode(seq: number): string {
  const safe = Math.max(1, Math.floor(seq));
  return `${CODE_PREFIX}${String(safe).padStart(4, '0')}`;
}

export function parsePautaCodeNumber(code?: string | null): number {
  if (!code) return 0;
  const match = code.match(/(\d+)/);
  if (!match) return 0;
  const num = parseInt(match[1], 10);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Ensures every article has a persistent, sequential internal control code (e.g. FN-0001).
 * Never displayed on public websites — strictly for internal newsroom & marketing workflows.
 */
export function hydratePautasWithInternalCodes(pautas: EditorialPauta[]): EditorialPauta[] {
  if (!Array.isArray(pautas) || pautas.length === 0) return [];

  let maxNum = pautas.reduce((max, p) => Math.max(max, parsePautaCodeNumber(p.internalCode)), 0);

  // Assign codes from oldest (bottom of array) to newest (top of array) for items missing a code
  const result = [...pautas];
  for (let i = result.length - 1; i >= 0; i--) {
    if (!result[i].internalCode || !result[i].internalCode?.trim()) {
      maxNum += 1;
      result[i] = {
        ...result[i],
        internalCode: formatPautaCode(maxNum),
      };
    }
  }
  return result;
}

export function getNextPautaInternalCode(existing: EditorialPauta[]): string {
  const maxNum = existing.reduce((max, p) => Math.max(max, parsePautaCodeNumber(p.internalCode)), 0);
  return formatPautaCode(maxNum + 1);
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Matches an article flexibly against internal number (e.g., "3", "03", "0003", "FN-0003", "#3"),
 * title, summary, city, editorial seal, reporter name, or citizen source protocol.
 */
export function matchesPautaQuery(pauta: EditorialPauta, rawQuery: string): boolean {
  const q = normalizeSearchText(rawQuery);
  if (!q) return true;

  const code = normalizeSearchText(pauta.internalCode || '');
  const codeNum = parsePautaCodeNumber(pauta.internalCode);

  // Direct numeric or code-like search ("3", "003", "#3", "fn-3", "fn0003")
  const cleanCodeQuery = q.replace(/^#/, '').replace(/^fn[-_\s]?/, '');
  if (/^\d+$/.test(cleanCodeQuery) && codeNum > 0) {
    const queryNum = parseInt(cleanCodeQuery, 10);
    if (
      codeNum === queryNum ||
      String(codeNum).includes(cleanCodeQuery) ||
      String(codeNum).padStart(4, '0').includes(cleanCodeQuery)
    ) {
      return true;
    }
  }

  if (code && code.includes(q)) return true;

  const haystack = normalizeSearchText(
    [
      pauta.title,
      pauta.city,
      pauta.seal,
      pauta.reporter,
      pauta.summary,
      pauta.sourceProtocol || '',
    ].join(' ')
  );

  return haystack.includes(q);
}
