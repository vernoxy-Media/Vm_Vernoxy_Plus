export interface DuplicateCandidate {
  company_id: number;
  name: string;
  city?: string | null;
  channels?: Array<{ channel_type: string; value: string }>;
}

export interface DuplicateMatchResult {
  company_id: number;
  name: string;
  city: string | null;
  reason: string;
}

export class CompanyDuplicateDetectionService {
  /**
   * Generates character trigrams for a string (same approach as Postgres pg_trgm).
   */
  static generateTrigrams(str: string): Set<string> {
    const normalized = `  ${str.toLowerCase()} `;
    const trigrams = new Set<string>();
    for (let i = 0; i < normalized.length - 2; i++) {
      trigrams.add(normalized.substring(i, i + 3));
    }
    return trigrams;
  }

  /**
   * Calculates trigram similarity between 0.0 and 1.0.
   */
  static calculateTrigramSimilarity(a: string, b: string): number {
    if (!a || !b) return 0;
    const cleanA = a.trim().toLowerCase();
    const cleanB = b.trim().toLowerCase();
    if (cleanA === cleanB) return 1.0;

    const trigramsA = this.generateTrigrams(cleanA);
    const trigramsB = this.generateTrigrams(cleanB);

    if (trigramsA.size === 0 || trigramsB.size === 0) return 0;

    let commonCount = 0;
    for (const t of trigramsA) {
      if (trigramsB.has(t)) {
        commonCount++;
      }
    }

    const similarity = (2 * commonCount) / (trigramsA.size + trigramsB.size);
    return Math.round(similarity * 1000) / 1000;
  }

  /**
   * Evaluates a candidate against input query parameters and returns a match result if any reason matches.
   */
  static evaluateCandidate(
    candidate: DuplicateCandidate,
    query: {
      name?: string;
      email?: string;
      phone?: string;
      website?: string;
    },
  ): DuplicateMatchResult | null {
    // 1. Exact name match
    if (query.name && candidate.name) {
      const lowerCandidate = candidate.name.trim().toLowerCase();
      const lowerQuery = query.name.trim().toLowerCase();
      if (lowerCandidate === lowerQuery) {
        return {
          company_id: candidate.company_id,
          name: candidate.name,
          city: candidate.city ?? null,
          reason: 'Exact company name match',
        };
      }

      // Trigram similarity >= 0.7
      const similarity = this.calculateTrigramSimilarity(candidate.name, query.name);
      if (similarity >= 0.7) {
        return {
          company_id: candidate.company_id,
          name: candidate.name,
          city: candidate.city ?? null,
          reason: `Similar company name (${Math.round(similarity * 100)}% match)`,
        };
      }
    }

    // 2. Channel matches
    if (candidate.channels && candidate.channels.length > 0) {
      for (const ch of candidate.channels) {
        const lowerVal = ch.value.toLowerCase().trim();

        if (query.email && ch.channel_type === 'email') {
          if (lowerVal === query.email.toLowerCase().trim()) {
            return {
              company_id: candidate.company_id,
              name: candidate.name,
              city: candidate.city ?? null,
              reason: `Matching email address: ${ch.value}`,
            };
          }
        }

        if (query.phone && (ch.channel_type === 'phone' || ch.channel_type === 'whatsapp')) {
          const cleanCandidatePhone = lowerVal.replace(/[\s\-\(\)\[\]]/g, '');
          const cleanQueryPhone = query.phone.replace(/[\s\-\(\)\[\]]/g, '');
          if (cleanCandidatePhone === cleanQueryPhone) {
            return {
              company_id: candidate.company_id,
              name: candidate.name,
              city: candidate.city ?? null,
              reason: `Matching phone number: ${ch.value}`,
            };
          }
        }

        if (query.website && ch.channel_type === 'website') {
          // Normalize domains for comparison
          const cleanCandidate = lowerVal.replace(/^https?:\/\//, '').replace(/\/$/, '');
          const cleanQuery = query.website.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
          if (cleanCandidate === cleanQuery) {
            return {
              company_id: candidate.company_id,
              name: candidate.name,
              city: candidate.city ?? null,
              reason: `Matching website: ${ch.value}`,
            };
          }
        }
      }
    }

    return null;
  }
}
