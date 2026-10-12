export class CrmNormalizationService {
  /**
   * Trims whitespace and collapses multiple consecutive inner whitespaces into a single space.
   */
  static normalizeName(name: string): string {
    if (!name) return '';
    return name.trim().replace(/\s+/g, ' ');
  }

  /**
   * Normalizes an email address: trimmed and lowercased.
   * Throws if format is invalid.
   */
  static normalizeEmail(email: string): string {
    const trimmed = (email || '').trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmed)) {
      throw new Error('INVALID_EMAIL_FORMAT');
    }
    return trimmed;
  }

  /**
   * Normalizes mobile/phone/whatsapp numbers:
   * Removes spaces, dashes, parentheses and brackets.
   * Validates against ^\+?[0-9]{7,15}$
   */
  static normalizePhone(phone: string): string {
    const cleaned = (phone || '').replace(/[\s\-\(\)\[\]]/g, '');
    const phoneRegex = /^\+?[0-9]{7,15}$/;
    if (!phoneRegex.test(cleaned)) {
      throw new Error('INVALID_PHONE_FORMAT');
    }
    return cleaned;
  }

  /**
   * Normalizes URL for website/facebook/instagram/x/linkedin:
   * - Strips leading/trailing whitespace
   * - Prepends https:// if no scheme is provided
   * - Rejects forbidden schemes like javascript:, data:, vbscript:
   * - Must be valid http(s) URL with a valid host
   * - Max 300 characters
   */
  static normalizeUrl(url: string): string {
    const raw = (url || '').trim();
    if (!raw) {
      throw new Error('EMPTY_URL');
    }

    // Explicitly reject dangerous schemes before URL parsing
    const lowerRaw = raw.toLowerCase();
    if (
      lowerRaw.startsWith('javascript:') ||
      lowerRaw.startsWith('data:') ||
      lowerRaw.startsWith('vbscript:') ||
      lowerRaw.startsWith('file:')
    ) {
      throw new Error('FORBIDDEN_URL_SCHEME');
    }

    let candidate = raw;
    if (!/^https?:\/\//i.test(candidate)) {
      candidate = `https://${candidate}`;
    }

    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      throw new Error('INVALID_URL');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('FORBIDDEN_URL_SCHEME');
    }

    if (!parsed.hostname || parsed.hostname.length === 0 || !parsed.hostname.includes('.')) {
      // Must have a valid hostname with at least one dot (e.g. example.com)
      if (parsed.hostname !== 'localhost') {
        throw new Error('INVALID_URL_HOST');
      }
    }

    const finalUrl = parsed.href;
    if (finalUrl.length > 300) {
      throw new Error('URL_TOO_LONG');
    }

    return finalUrl;
  }

  /**
   * Normalizes channel value based on channel_type:
   * - email -> lowercased, validated
   * - phone, whatsapp -> stripped of spaces/dashes/brackets, validated
   * - website, facebook, instagram, x, linkedin -> prepends https://, validates URL, host, scheme, max 300 chars
   */
  static normalizeChannelValue(type: string, value: string): string {
    switch (type) {
      case 'email':
        return this.normalizeEmail(value);
      case 'phone':
      case 'whatsapp':
        return this.normalizePhone(value);
      case 'website':
      case 'facebook':
      case 'instagram':
      case 'x':
      case 'linkedin':
        return this.normalizeUrl(value);
      default:
        return (value || '').trim();
    }
  }
}
