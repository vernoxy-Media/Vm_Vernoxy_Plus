import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { categoryLabel, categoryOptions, prettyCode } from './project-categories';

const fits = [
  { code: 'website_development', label: 'Website Development' },
  { code: 'crm_erp', label: 'CRM / ERP Software' },
];

describe('project categories (Service Fits)', () => {
  it('offers every Service Fit, each with its own colour', () => {
    const options = categoryOptions(fits);
    assert.deepEqual(options.map((o) => o.key), ['website_development', 'crm_erp']);
    assert.notEqual(options[0].color, options[1].color);
  });

  it('keeps a category a project still has even when its Service Fit was switched off', () => {
    const options = categoryOptions(fits, [{ category: 'seo' }, { category: 'crm_erp' }, { category: 'seo' }]);
    assert.deepEqual(options.map((o) => o.key), ['website_development', 'crm_erp', 'seo']);
    assert.equal(options[2].label, 'Seo');
  });

  it('names a category by its Service Fit, or what was typed for "other"', () => {
    const options = categoryOptions([...fits, { code: 'other', label: 'Other' }]);
    assert.equal(categoryLabel('crm_erp', options), 'CRM / ERP Software');
    assert.equal(categoryLabel('other', options, ' Chatbot '), 'Chatbot');
    assert.equal(categoryLabel('other', options), 'Other');
    assert.equal(categoryLabel(null, options), 'General');
    assert.equal(prettyCode('ecom_website'), 'Ecom website');
  });
});
