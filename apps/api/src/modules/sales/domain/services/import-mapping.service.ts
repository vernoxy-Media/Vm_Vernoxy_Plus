import { FieldError } from '../errors/sales.errors';
import { IMPORT_FIELDS, IMPORT_FIELD_KEYS, NOT_IMPORTABLE_HEADERS, matchKey } from '../entities/import-fields';

export interface FileColumn {
  /** The key the spreadsheet reader gives the column (header in lower case, spaces as underscores). */
  key: string;
  /** The header as typed in the file. */
  header: string;
}

export interface ColumnMatch extends FileColumn {
  /** The field the column is matched to, or null for "Do not import". */
  field: string | null;
  /** How it was matched: by name automatically, or nothing found. */
  how: 'name' | 'none' | 'not_importable';
}

const BY_KEY = new Map<string, string>();
for (const f of IMPORT_FIELDS) {
  BY_KEY.set(matchKey(f.header), f.key);
  BY_KEY.set(matchKey(f.key), f.key);
  for (const a of f.aliases ?? []) if (!BY_KEY.has(matchKey(a))) BY_KEY.set(matchKey(a), f.key);
}

/**
 * "Columns with the same name as a field are matched automatically. The user matches the rest
 * or marks them Do not import." A field is matched to at most one column (the first one).
 */
export function suggestMapping(columns: FileColumn[]): ColumnMatch[] {
  const used = new Set<string>();
  return columns.map((c) => {
    if (NOT_IMPORTABLE_HEADERS.includes(matchKey(c.header))) return { ...c, field: null, how: 'not_importable' as const };
    const field = BY_KEY.get(matchKey(c.header));
    if (field && !used.has(field)) {
      used.add(field);
      return { ...c, field, how: 'name' as const };
    }
    return { ...c, field: null, how: 'none' as const };
  });
}

/** The mapping the user confirms: file column key -> field key (null = Do not import). */
export type ColumnMapping = Record<string, string | null>;

export function toMapping(matches: ColumnMatch[]): ColumnMapping {
  return Object.fromEntries(matches.map((m) => [m.key, m.field]));
}

/** Rejects unknown fields and a field used by two columns; Company Name must be matched. */
export function validateMapping(mapping: ColumnMapping, columns: FileColumn[]): FieldError[] {
  const errors: FieldError[] = [];
  const known = new Set(columns.map((c) => c.key));
  const seen = new Map<string, string>();
  for (const [col, field] of Object.entries(mapping)) {
    if (!known.has(col)) {
      errors.push({ field: `mapping.${col}`, message: 'This column is not in the file.' });
      continue;
    }
    if (field === null) continue;
    if (!IMPORT_FIELD_KEYS.has(field)) {
      errors.push({ field: `mapping.${col}`, message: `"${field}" is not a field of the Sales Fields sheet.` });
      continue;
    }
    const other = seen.get(field);
    if (other) errors.push({ field: `mapping.${col}`, message: `"${field}" is already matched to another column.` });
    seen.set(field, col);
  }
  if (![...seen.keys()].includes('name')) {
    errors.push({ field: 'mapping', message: 'Match a column to Company Name; it is required.' });
  }
  return errors;
}

/** Picks the values of one file row by field key, dropping empty cells. */
export function pickValues(cells: Record<string, string>, mapping: ColumnMapping): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [col, field] of Object.entries(mapping)) {
    if (!field) continue;
    const v = (cells[col] ?? '').trim();
    if (v !== '') out[field] = v;
  }
  return out;
}
