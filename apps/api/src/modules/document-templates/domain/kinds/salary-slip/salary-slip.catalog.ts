import { LayoutCatalog } from '../../layout';

/** document_templates.document_type of the monthly Salary Slip (also used by Payroll). */
export const SALARY_SLIP_KIND = 'payroll_salary_slip';

/**
 * What a Salary Slip can show. Every value comes from the Employee record and that month's Payroll:
 * the Admin chooses what is shown and how it is labelled, never the amounts or day counts.
 * (Earning and deduction rows beyond Basic, Overtime and PF come from the Addition / Deduction
 * categories in Master Data, entered in Payroll each month.)
 *
 * Page order: header, Employee Summary beside the Net Pay card, Earnings | Deductions, Total Net
 * Payable, signature, footer.
 */
export const SALARY_SLIP_CATALOG: LayoutCatalog = {
  kind: SALARY_SLIP_KIND,
  default_title: 'SALARY SLIP',
  uses_letterhead: true,
  sections: [
    {
      key: 'header',
      title: 'Header',
      has_title: false,
      can_hide: false,
      fields: [
        { key: 'pay_month', label: 'Pay Month', visible: true, required: true },
        { key: 'pay_date', label: 'Pay Date', visible: true },
        { key: 'slip_no', label: 'Slip No.', visible: true, required: true },
      ],
      options: [],
    },
    {
      key: 'employee',
      title: 'EMPLOYEE SUMMARY',
      has_title: true,
      can_hide: false,
      fields: [
        { key: 'employee_name', label: 'Employee Name', visible: true, required: true },
        { key: 'employee_id', label: 'Employee ID', visible: true, required: true },
        { key: 'department', label: 'Department', visible: true },
        { key: 'designation', label: 'Designation', visible: true },
        { key: 'uan', label: 'UAN Number', visible: true },
      ],
      options: [],
    },
    {
      // Card beside Employee Summary: the net pay, large, with day counts under it.
      key: 'net_pay_card',
      title: 'Total Net Pay',
      has_title: true,
      can_hide: false,
      fields: [
        { key: 'paid_days', label: 'Paid Days', visible: true },
        { key: 'lop_days', label: 'LOP Days', visible: true },
        { key: 'total_working_days', label: 'Working Days', visible: false },
        { key: 'present_days', label: 'Present Days', visible: false },
        { key: 'half_days', label: 'Half Days', visible: false },
        { key: 'paid_leave_days', label: 'Paid Leave Days', visible: false },
        { key: 'unpaid_leave_days', label: 'Unpaid Leave Days', visible: false },
      ],
      options: [],
    },
    {
      key: 'earnings',
      title: 'EARNINGS',
      has_title: true,
      can_hide: false,
      fields: [
        { key: 'basic', label: 'Basic Salary', visible: true, required: true },
        { key: 'overtime', label: 'Overtime', visible: true, required: true },
        { key: 'additions', label: 'Additions (one row per category)', visible: true, required: true, label_editable: false },
        { key: 'total', label: 'Gross Earnings', visible: true, required: true },
      ],
      options: [{ key: 'hide_zero_rows', label: 'Hide rows with ₹0', type: 'boolean', default: true }],
    },
    {
      key: 'deductions',
      title: 'DEDUCTIONS',
      has_title: true,
      can_hide: false,
      fields: [
        { key: 'provident_fund', label: 'Provident Fund (PF)', visible: true, required: true },
        { key: 'deductions', label: 'Deductions (one row per category)', visible: true, required: true, label_editable: false },
        { key: 'total', label: 'Total Deductions', visible: true, required: true },
      ],
      options: [{ key: 'hide_zero_rows', label: 'Hide rows with ₹0', type: 'boolean', default: true }],
    },
    {
      // Bar under the amounts: the net payable, how it is made, and the amount in words.
      key: 'net_payable',
      title: 'TOTAL NET PAYABLE',
      has_title: true,
      can_hide: false,
      fields: [],
      options: [
        { key: 'subtitle', label: 'Line under the heading', type: 'text', default: 'Gross Earnings - Total Deductions' },
        { key: 'show_words', label: 'Show the amount in words', type: 'boolean', default: true },
        { key: 'words_label', label: 'Amount in words label', type: 'text', default: 'Amount In Words' },
      ],
    },
    {
      // Bottom right: the uploaded signature image (layout.signature_asset_id), the signer and a caption.
      key: 'signature',
      title: 'Signature',
      has_title: false,
      can_hide: true,
      fields: [],
      options: [
        {
          key: 'caption',
          label: 'Caption',
          type: 'text',
          default: 'Authorised Signatory',
          suggestions: ['Authorised Signatory', 'Approved by', 'Signed by', 'Prepared by', 'Verified by'],
        },
        { key: 'name', label: 'Signer name', type: 'text', default: '' },
        { key: 'designation', label: 'Signer designation', type: 'text', default: '' },
      ],
    },
    {
      key: 'footer',
      title: 'Footer',
      has_title: false,
      can_hide: true,
      fields: [],
      options: [
        { key: 'note', label: 'Note', type: 'text', default: '-- This is a system-generated document. --' },
        { key: 'thanks', label: 'Closing line', type: 'text', default: 'Thank you for your contribution!' },
      ],
    },
  ],
};
