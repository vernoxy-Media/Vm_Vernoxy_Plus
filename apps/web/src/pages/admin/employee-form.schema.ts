import * as z from 'zod';

export const employeeCreateSchema = z
  .object({
    name: z.string().trim().min(1, 'Full name is required'),
    email: z
      .string()
      .trim()
      .min(1, 'Office email is required')
      .email('Please enter a valid office email address'),
    personal_email: z
      .string()
      .trim()
      .email('Please enter a valid personal email address')
      .optional()
      .or(z.literal('')),
    office_email: z.string().trim().optional(),
    mob: z.string().optional(),
    gender_id: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
      z.number().optional().nullable(),
    ),
    emergency_contact_name: z.string().optional(),
    emergency_contact_number: z.string().optional(),
    emergency_contact_relation: z.string().optional(),
    birth_date: z.string().optional(),
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
    employment_type_id: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
      z.number().optional().nullable(),
    ),
    joining_date: z.string().min(1, 'Joining date is required'),
    salary: z.coerce.number().min(0, 'Salary cannot be negative').default(0),
    pf: z.coerce.number().min(0, 'PF cannot be negative').default(0),
    exit_date: z.string().optional(),
    status: z.enum(['Active', 'Inactive']).default('Active'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirm_password: z.string().min(1, 'Please confirm your password'),
    must_change_password: z.boolean().default(false),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export const employeeEditSchema = z.object({
  name: z.string().trim().min(1, 'Full name is required'),
  email: z
    .string()
    .trim()
    .email('Please enter a valid office email address')
    .optional(),
  personal_email: z
    .string()
    .trim()
    .email('Please enter a valid personal email address')
    .optional()
    .or(z.literal('')),
  office_email: z.string().trim().optional(),
  mob: z.string().optional(),
  gender_id: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().optional().nullable(),
  ),
  emergency_contact_name: z.string().optional(),
  emergency_contact_number: z.string().optional(),
  emergency_contact_relation: z.string().optional(),
  birth_date: z.string().optional(),
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
  employment_type_id: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().optional().nullable(),
  ),
  joining_date: z.string().min(1, 'Joining date is required'),
  salary: z.coerce.number().min(0, 'Salary cannot be negative').default(0),
  pf: z.coerce.number().min(0, 'PF cannot be negative').default(0),
  exit_date: z.string().optional(),
  status: z.enum(['Active', 'Inactive']).default('Active'),
});

export type EmployeeFormValues = z.infer<typeof employeeCreateSchema>;
export type EmployeeEditFormValues = z.infer<typeof employeeEditSchema>;
