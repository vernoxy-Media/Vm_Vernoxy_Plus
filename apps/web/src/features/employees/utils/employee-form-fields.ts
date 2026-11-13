/** How the Add Employee form names its fields, in words, and which of its two tabs each one is on. */

export type EmployeeFormTab = 'personal' | 'job';

const LABELS: Record<string, string> = {
  name: 'Full name',
  email: 'Work email',
  personal_email: 'Personal email',
  office_email: 'Office email',
  mob: 'Mobile number',
  gender_id: 'Gender',
  birth_date: 'Date of birth',
  blood_group: 'Blood group',
  address: 'Address',
  emergency_contact_name: 'Emergency contact name',
  emergency_contact_number: 'Emergency contact number',
  emergency_contact_relation: 'Emergency contact relation',
  password: 'Password',
  confirm_password: 'Confirm password',
  department_ids: 'Departments',
  dep_id: 'Departments',
  role_id: 'Designation',
  reporting_manager: 'Reporting manager',
  employment_type_id: 'Employment type',
  joining_date: 'Joining date',
  leave_policy_id: 'Leave policy',
  salary: 'Salary',
  pf: 'PF amount',
  pf_applicable: 'PF applicable',
  uan: 'UAN',
  employee_pf_pct: 'Employee PF %',
  employer_pf_pct: 'Employer PF %',
  ot_eligible: 'Overtime eligibility',
  ot_rate_type: 'Overtime rate type',
  ot_rate: 'Overtime rate',
  ot_multiplier: 'Overtime multiplier',
  minimum_ot_per_day: 'Minimum overtime per day',
  ot_paid_as: 'Overtime paid as',
  payment_mode: 'Payment mode',
  bank_name: 'Bank name',
  account_number: 'Account number',
  ifsc_code: 'IFSC code',
  probation_period: 'Probation period',
  notice_period: 'Notice period',
};

const PERSONAL = new Set([
  'name',
  'email',
  'personal_email',
  'office_email',
  'mob',
  'gender_id',
  'birth_date',
  'blood_group',
  'address',
  'emergency_contact_name',
  'emergency_contact_number',
  'emergency_contact_relation',
]);

/** The API calls the main department `dep_id`; the form shows it inside Departments. */
export function formFieldName(field: string): string {
  return field === 'dep_id' ? 'department_ids' : field;
}

export function isKnownField(field?: string): field is string {
  return Boolean(field && field in LABELS);
}

export function fieldLabel(field?: string): string {
  return field && LABELS[field] ? LABELS[field]! : '';
}

export function tabOfField(field: string): EmployeeFormTab {
  return PERSONAL.has(field) ? 'personal' : 'job';
}
