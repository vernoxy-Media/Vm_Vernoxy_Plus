import { CategoryRule, computeFlags, draftErrors, formatClaimNo, receiptFileError, submitErrors, validAmount } from './expense-rules';

const travel: CategoryRule = {
  category_id: 1,
  name: 'Travel – Local Conveyance',
  is_active: true,
  allowed_type: 'OFFICE',
  limit_per_claim: 1500,
  receipt_rule: 'ABOVE_THRESHOLD',
  receipt_threshold_amount: 500,
};
const base = {
  expense_date: '2026-10-22',
  category_id: 1,
  expense_type: 'Office Expense',
  amount: 640,
  description: 'Cab from office to client site and back for the review.',
};
const bill = { file_name: 'uber.pdf', mime_type: 'application/pdf', file_size_bytes: 184_000 };

describe('expense-rules', () => {
  it('a draft needs only the Expense Date', () => {
    expect(draftErrors({ expense_date: '2026-10-22' }, '2026-11-05')).toEqual({});
    expect(draftErrors({}, '2026-11-05').expense_date).toBe('Please fill this field.');
    expect(draftErrors({ expense_date: '2026-11-06' }, '2026-11-05').expense_date).toBe('The expense date cannot be in the future.');
  });

  it('submit: BFD example passes with 2 receipts', () => {
    expect(submitErrors(base, travel, [bill, bill], '2026-11-05')).toEqual({});
  });

  it('submit: receipt required above ₹ 500', () => {
    expect(submitErrors(base, travel, [], '2026-11-05').receipts).toBe('A receipt is required for this category above ₹ 500.00.');
    expect(submitErrors({ ...base, amount: 350 }, travel, [], '2026-11-05').receipts).toBeUndefined();
  });

  it('submit: description 10–500, type allowed, switched-off category', () => {
    expect(submitErrors({ ...base, description: 'cab' }, travel, [bill], '2026-11-05').description).toBe(
      'Please write at least 10 characters about the purpose.',
    );
    expect(submitErrors({ ...base, expense_type: 'Personal Expense' }, travel, [bill], '2026-11-05').expense_type).toBeDefined();
    expect(submitErrors(base, { ...travel, is_active: false }, [bill], '2026-11-05').category_id).toBe(
      'This category is no longer in use. Please choose another.',
    );
  });

  it('amount: more than 0, up to 2 decimals, up to ₹ 10,00,000', () => {
    expect(validAmount(640)).toBe(true);
    expect(validAmount(640.55)).toBe(true);
    expect(validAmount(640.555)).toBe(false);
    expect(validAmount(0)).toBe(false);
    expect(validAmount(1000000.01)).toBe(false);
  });

  it('files: PDF/JPG/PNG, 5 MB each, up to 5 files', () => {
    expect(receiptFileError([bill])).toBeNull();
    expect(receiptFileError([{ ...bill, file_size_bytes: 6 * 1024 * 1024 }])).not.toBeNull();
    expect(receiptFileError([{ file_name: 'a.docx', mime_type: 'application/msword', file_size_bytes: 10 }])).not.toBeNull();
    expect(receiptFileError([bill, bill, bill, bill, bill, bill])).not.toBeNull();
  });

  it('flags: above limit, duplicate and late never stop', () => {
    const flags = computeFlags({ ...base, amount: 12400, expense_date: '2026-08-19' }, travel, { claim_id: 3, claim_no: 'EXP/2026/10/0003' }, 60, '2026-10-20');
    expect(flags.map((f) => f.code)).toEqual(['ABOVE_LIMIT', 'POSSIBLE_DUPLICATE', 'LATE']);
    expect(computeFlags(base, travel, null, 60, '2026-10-22')).toEqual([]);
  });

  it('claim number by month of submission', () => {
    expect(formatClaimNo('2026-10-22', 7)).toBe('EXP/2026/10/0007');
  });
});
