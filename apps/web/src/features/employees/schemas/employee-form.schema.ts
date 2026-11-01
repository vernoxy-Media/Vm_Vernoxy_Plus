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

export const employeeCreateSchema = z
  .object({
    name: z.string().trim().min(1, 'Please fill this field.'),
    email: z
      .string()
      .trim()
      .min(1, 'Please fill this field.')
      .email('Please enter a valid email.'),
    personal_email: z
      .string()
      .trim()
      .email('Please enter a valid email.')
      .optional()
      .or(z.literal('')),
    office_email: z.string().trim().optional(),
    mob: z
      .string()
      .optional()
      .refine(
        (val) => !val || phoneRegex.test(val.replace(/^\+91\s*/, '').trim()),
        { message: 'The phone number must be 10 digits.' },
      ),
    gender_id: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
      z.number().optional().nullable(),
    ),
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
    salary: z.coerce.number().min(0, 'Please enter 0 or more.').default(0),
    pf: z.coerce.number().min(0, 'Please enter 0 or more.').default(0),
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
  name: z.string().trim().min(1, 'Please fill this field.'),
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
  mob: z
    .string()
    .optional()
    .refine(
      (val) => !val || phoneRegex.test(val.replace(/^\+91\s*/, '').trim()),
      { message: 'The phone number must be 10 digits.' },
    ),
  gender_id: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().optional().nullable(),
  ),
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
  salary: z.coerce.number().min(0, 'Please enter 0 or more.').default(0),
  pf: z.coerce.number().min(0, 'Please enter 0 or more.').default(0),
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
