export class SpreadsheetCellNormalizer {
  /**
   * Normalizes header: case-insensitive, trimmed, spaces and hyphens to underscores.
   */
  static normalizeHeader(header: string): string {
    if (!header) return '';
    return header
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
  }

  /**
   * Injection rule on IMPORT:
   * The importer strips exactly that one leading quote when the next char is one of = + - @.
   */
  static stripInjectionPrefix(value: string): string {
    if (!value || typeof value !== 'string') return value;
    if (value.startsWith("'") && value.length > 1) {
      const secondChar = value[1];
      if (secondChar === '=' || secondChar === '+' || secondChar === '-' || secondChar === '@') {
        return value.slice(1);
      }
    }
    return value;
  }

  /**
   * Injection rule on EXPORT:
   * Any text cell starting with = + - @ tab or CR is written with a leading apostrophe-safe prefix (a single quote).
   */
  static applyInjectionPrefix(value: string): string {
    if (!value || typeof value !== 'string') return value;
    const firstChar = value[0];
    if (
      firstChar === '=' ||
      firstChar === '+' ||
      firstChar === '-' ||
      firstChar === '@' ||
      firstChar === '\t' ||
      firstChar === '\r'
    ) {
      return `'${value}`;
    }
    return value;
  }

  /**
   * Trims and collapses multiple spaces into a single space.
   */
  static normalizeText(value: string): string {
    if (!value || typeof value !== 'string') return '';
    return value.replace(/\s+/g, ' ').trim();
  }
}
