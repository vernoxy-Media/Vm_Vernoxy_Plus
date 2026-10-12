import * as z from 'zod';

export const employeeCreateSchema = z
  .object({
    name: z.string().trim().min(1, 'Full name is required'),
    email: z
      .string()
      .trim()
      .min(1, 'Work email is required')
      .email('Please enter a valid work email address'),
    mob: z.string().optional(),
    dep_id: z.coerce.number().min(1, 'Department is required'),
    role_id: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
      z.number().optional().nullable(),
    ),
    reporting_manager: z.coerce.number().nullable().optional(),
    joining_date: z.string().min(1, 'Joining date is required'),
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
  mob: z.string().optional(),
  dep_id: z.coerce.number().min(1, 'Department is required'),
  role_id: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().optional().nullable(),
  ),
  reporting_manager: z.coerce.number().nullable().optional(),
  joining_date: z.string().min(1, 'Joining date is required'),
  exit_date: z.string().optional(),
  status: z.enum(['Active', 'Inactive']).default('Active'),
});

export type EmployeeFormValues = z.infer<typeof employeeCreateSchema>;
