import * as z from 'zod';

function isAtLeast18(dateStr?: string | null): boolean {
  if (!dateStr) return true;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
    age--;
  }
  return age >= 18;
}

const phoneRegex = /^[0-9]{10}$/;

/** A person's name: letters (any language), spaces and . ' - only. No digits or symbols. */
const nameRegex = /^[\p{L}][\p{L}\p{M} .'’-]*$/u;
const NAME_MESSAGE = "Name can contain only letters, spaces and . ' - (no numbers or special characters).";

const personName = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(100, `${label} must be at most 100 characters.`)
    .regex(nameRegex, NAME_MESSAGE);

/** An amount that is typed in: a number, never negative. Says so instead of failing silently. */
const amount = (label: string) =>
  z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? 0 : Number(val)),
    z
      .number({ message: `${label} must be a number.` })
      .min(0, `${label} cannot be negative.`),
  );

const phoneField = z
  .string()
  .trim()
  .refine((val) => !val || phoneRegex.test(val.replace(/^\+91\s*/, '').trim()), {
    message: 'The phone number must be 10 digits.',
  });

export const emergencyContactSchema = z.object({
  name: z.string().trim(),
  relation: z.string().trim().optional(),
  number: z.string().trim(),
});

export type EmergencyContactValue = z.infer<typeof emergencyContactSchema>;

/** A row left completely empty is ignored; a half-filled row says what is missing. */
const emergencyContactsField = z.array(emergencyContactSchema).max(5, 'At most 5 emergency contacts can be added.').superRefine((rows, ctx) => {
  rows.forEach((r, i) => {
    if (!r.name && !r.number && !(r.relation ?? '')) return;
    if (!r.name) ctx.addIssue({ code: 'custom', path: [i, 'name'], message: 'Contact name is required.' });
    else if (!nameRegex.test(r.name)) ctx.addIssue({ code: 'custom', path: [i, 'name'], message: NAME_MESSAGE });
    if (!r.number) ctx.addIssue({ code: 'custom', path: [i, 'number'], message: 'Contact phone number is required.' });
    else if (!/^\+?[0-9]{7,15}$/.test(r.number.replace(/[\s()-]/g, ''))) {
      ctx.addIssue({ code: 'custom', path: [i, 'number'], message: 'Enter a valid phone number (7 to 15 digits).' });
    }
    if (r.relation && !/^[\p{L}][\p{L}\p{M} .'’/-]{0,49}$/u.test(r.relation)) {
      ctx.addIssue({ code: 'custom', path: [i, 'relation'], message: 'Relation can contain only letters.' });
    }
  });
});

export const employeeCreateSchema = z
  .object({
    name: personName('Full name'),
    email: z
      .string()
      .trim()
      .min(1, 'Please fill this field.')
      .email('Please enter a valid email.'),
    personal_email: z.string().trim().min(1, 'Personal email is required.').email('Please enter a valid email.'),
    office_email: z.string().trim().optional(),
    mob: z.string().trim().min(1, 'Phone number is required.').pipe(phoneField),
    gender_id: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
      z.number({ message: 'Gender is required.' }),
    ),
    emergency_contacts: emergencyContactsField.default([]),
    emergency_contact_name: z.string().optional(),
    emergency_contact_number: z.string().optional(),
    emergency_contact_relation: z.string().optional(),
    birth_date: z
      .string()
      .min(1, 'Birth date is required.')
      .refine((val) => isAtLeast18(val), {
        message: 'Employees must be 18 or older.',
      }),
    blood_group: z.string().optional(),
    address: z.string().optional(),
    dep_id: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? 1 : Number(val)),
      z.number().default(1),
    ),
    department_ids: z.array(z.number()).min(1, 'Please select at least one department'),
    role_ids: z.array(z.number()).min(1, 'Please select at least one designation'),
    role_id: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
      z.number().optional().nullable(),
    ),
    reporting_manager: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
      z.number().optional().nullable(),
    ),
    leave_policy_id: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
      z.number().optional().nullable(),
    ),
    employment_type_id: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
      z.number({ message: 'Employment type is required.' }),
    ),
    joining_date: z.string().min(1, 'Joining date is required.'),
    probation_period: z.string().optional().nullable(),
    notice_period: z.string().optional().nullable(),
    salary: amount('Salary'),
    pf: amount('PF amount'),
    // Overtime (OT)
    ot_eligible: z.boolean().default(false),
    ot_rate_type: z.enum(['FIXED', 'MULTIPLIER']).optional().nullable(),
    ot_rate: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
      z.number().min(0, 'OT rate cannot be negative').optional().nullable(),
    ),
    ot_multiplier: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
      z.number().min(0, 'OT multiplier cannot be negative').optional().nullable(),
    ),
    minimum_ot_per_day: z.coerce.number().min(0).default(0),
    ot_paid_as: z.enum(['SALARY', 'COMP_OFF']).default('SALARY'),
    // Statutory & Banking
    pf_applicable: z.boolean().default(false),
    uan: z.string().trim().optional().nullable().or(z.literal('')),
    employee_pf_pct: z.coerce.number().min(0).max(100).default(12),
    employer_pf_pct: z.coerce.number().min(0).max(100).default(12),
    payment_mode: z.enum(['BANK_TRANSFER', 'CHEQUE', 'CASH']).optional().nullable(),
    bank_name: z.string().trim().optional().nullable().or(z.literal('')),
    account_number: z.string().trim().optional().nullable().or(z.literal('')),
    ifsc_code: z.string().trim().optional().nullable().or(z.literal('')),
    exit_date: z.string().optional(),
    status: z.enum(['Active', 'Inactive', 'Onboarding']).default('Active'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirm_password: z.string().min(1, 'Please confirm your password'),
    must_change_password: z.boolean().default(false),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export const employeeEditSchema = z.object({
  name: personName('Full name'),
  email: z
    .string()
    .trim()
    .email('Please enter a valid email.')
    .optional(),
  personal_email: z
    .string()
    .trim()
    .email('Please enter a valid email.')
    .optional()
    .or(z.literal('')),
  office_email: z.string().trim().optional(),
  mob: z.string().trim().min(1, 'Phone number is required.').pipe(phoneField),
  gender_id: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().optional().nullable(),
  ),
  emergency_contacts: emergencyContactsField.default([]),
  emergency_contact_name: z.string().optional(),
  emergency_contact_number: z.string().optional(),
  emergency_contact_relation: z.string().optional(),
  birth_date: z
    .string()
    .optional()
    .refine((val) => !val || isAtLeast18(val), {
      message: 'Employees must be 18 or older.',
    }),
  blood_group: z.string().optional(),
  address: z.string().optional(),
  dep_id: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? 1 : Number(val)),
    z.number().default(1),
  ),
  department_ids: z.array(z.number()).min(1, 'Please select at least one department'),
  role_ids: z.array(z.number()),
  role_id: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().optional().nullable(),
  ),
  reporting_manager: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().optional().nullable(),
  ),
  leave_policy_id: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().optional().nullable(),
  ),
  employment_type_id: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().optional().nullable(),
  ),
  joining_date: z.string().min(1, 'Please fill this field.'),
  probation_period: z.string().optional().nullable(),
  notice_period: z.string().optional().nullable(),
  salary: amount('Salary'),
  pf: amount('PF amount'),
  // Overtime (OT)
  ot_eligible: z.boolean().default(false),
  ot_rate_type: z.enum(['FIXED', 'MULTIPLIER']).optional().nullable(),
  ot_rate: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().min(0, 'OT rate cannot be negative').optional().nullable(),
  ),
  ot_multiplier: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().min(0, 'OT multiplier cannot be negative').optional().nullable(),
  ),
  minimum_ot_per_day: z.coerce.number().min(0).default(0),
  ot_paid_as: z.enum(['SALARY', 'COMP_OFF']).default('SALARY'),
  // Statutory & Banking
  pf_applicable: z.boolean().default(false),
  uan: z.string().trim().optional().nullable().or(z.literal('')),
  employee_pf_pct: z.coerce.number().min(0).max(100).default(12),
  employer_pf_pct: z.coerce.number().min(0).max(100).default(12),
  payment_mode: z.enum(['BANK_TRANSFER', 'CHEQUE', 'CASH']).optional().nullable(),
  bank_name: z.string().trim().optional().nullable().or(z.literal('')),
  account_number: z.string().trim().optional().nullable().or(z.literal('')),
  ifsc_code: z.string().trim().optional().nullable().or(z.literal('')),
  exit_date: z.string().optional(),
  status: z.enum(['Active', 'Inactive', 'Onboarding']).default('Active'),
});

export type EmployeeFormValues = z.infer<typeof employeeCreateSchema>;
export type EmployeeEditFormValues = z.infer<typeof employeeEditSchema>;
