import { regretEmailContent } from './smtp-candidate-mailer.adapter';

describe('regret email', () => {
  it('is addressed to the candidate, names the position, and escapes what was typed', () => {
    const m = regretEmailContent({ to: 'a@b.com', candidateName: 'Asha <b>Patel</b>', position: 'Business Analyst' }, 'Vernoxy');
    expect(m.subject).toBe('Your application for the Business Analyst position at Vernoxy');
    expect(m.text).toContain('Dear Asha <b>Patel</b>,');
    expect(m.text).toContain('not to move forward');
    expect(m.html).toContain('Asha &lt;b&gt;Patel&lt;/b&gt;');
    expect(m.html).not.toContain('<b>Patel</b>');
  });

  it('reads well without a position', () => {
    expect(regretEmailContent({ to: 'a@b.com', candidateName: 'Ravi', position: null }, 'Vernoxy').subject).toBe('Your application at Vernoxy');
  });
});
