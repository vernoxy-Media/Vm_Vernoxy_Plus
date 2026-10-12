import { CompanyDuplicateDetectionService } from './company-duplicate-detection.service';

describe('CompanyDuplicateDetectionService', () => {
  describe('calculateTrigramSimilarity', () => {
    it('should return 1.0 for exact matches', () => {
      expect(CompanyDuplicateDetectionService.calculateTrigramSimilarity('Acme Corp', 'acme corp')).toBe(1.0);
    });

    it('should calculate high similarity for close names', () => {
      const sim = CompanyDuplicateDetectionService.calculateTrigramSimilarity('Acme Technologies Inc', 'Acme Technology Inc');
      expect(sim).toBeGreaterThanOrEqual(0.7);
    });

    it('should calculate low similarity for different names', () => {
      const sim = CompanyDuplicateDetectionService.calculateTrigramSimilarity('Acme Corp', 'Zenith Logistics');
      expect(sim).toBeLessThan(0.3);
    });
  });

  describe('evaluateCandidate', () => {
    const candidate = {
      company_id: 10,
      name: 'Acme Solutions Ltd',
      city: 'Mumbai',
      channels: [
        { channel_type: 'email', value: 'info@acmesolutions.com' },
        { channel_type: 'phone', value: '+919876543210' },
        { channel_type: 'website', value: 'https://acmesolutions.com' },
      ],
    };

    it('should detect exact company name match', () => {
      const result = CompanyDuplicateDetectionService.evaluateCandidate(candidate, {
        name: 'acme solutions ltd',
      });
      expect(result).not.toBeNull();
      expect(result?.reason).toBe('Exact company name match');
      expect(result?.company_id).toBe(10);
    });

    it('should detect trigram similarity >= 0.7', () => {
      const result = CompanyDuplicateDetectionService.evaluateCandidate(candidate, {
        name: 'Acme Solution Ltd', // 1 letter difference
      });
      expect(result).not.toBeNull();
      expect(result?.reason).toContain('Similar company name');
    });

    it('should detect email channel duplicate', () => {
      const result = CompanyDuplicateDetectionService.evaluateCandidate(candidate, {
        email: 'INFO@acmesolutions.com',
      });
      expect(result).not.toBeNull();
      expect(result?.reason).toContain('Matching email address');
    });

    it('should detect phone channel duplicate with formatting differences', () => {
      const result = CompanyDuplicateDetectionService.evaluateCandidate(candidate, {
        phone: '+91 (987) 654-3210',
      });
      expect(result).not.toBeNull();
      expect(result?.reason).toContain('Matching phone number');
    });

    it('should detect website channel duplicate', () => {
      const result = CompanyDuplicateDetectionService.evaluateCandidate(candidate, {
        website: 'acmesolutions.com/',
      });
      expect(result).not.toBeNull();
      expect(result?.reason).toContain('Matching website');
    });

    it('should return null when no duplicate matches', () => {
      const result = CompanyDuplicateDetectionService.evaluateCandidate(candidate, {
        name: 'Global Ventures',
        email: 'other@global.com',
        phone: '+911122334455',
        website: 'globalventures.org',
      });
      expect(result).toBeNull();
    });
  });
});
