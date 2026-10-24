import { z } from 'zod';

export const leadFormSchema = z
  .object({
    // Company Profile
    company_name: z.string().min(2, 'Company name must be at least 2 characters'),
    no_of_branches: z.coerce.number().min(0).default(0),
    no_of_plants: z.coerce.number().min(0).default(0),
    products_services: z.string().optional().nullable(),
    nature_of_business: z.string().optional().nullable(),
    industry: z.string().optional().nullable(),
    industry_id: z.coerce.number().optional().nullable(),
    estimated_employees: z.coerce.number().optional().nullable(),
    estimated_turnover: z.coerce.number().optional().nullable(),
    year_established: z.coerce
      .number()
      .min(1800, 'Year must be valid')
      .max(new Date().getFullYear(), 'Year cannot be in the future')
      .optional()
      .nullable(),
    existing_major_clients: z.string().optional().nullable(),

    // Location & GIDC
    full_address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    country: z.string().default('India'),
    pin: z
      .string()
      .regex(/^[0-9]{6}$/, 'PIN must be a 6-digit number')
      .optional()
      .or(z.literal(''))
      .nullable(),
    google_maps_url: z.string().url('Must be a valid URL').optional().or(z.literal('')).nullable(),
    is_gidc: z.boolean().default(false),
    gidc_name: z.string().optional().nullable(),
    gidc_area_phase: z.string().optional().nullable(),

    // Contact Person
    contact_person: z.string().optional().nullable(),
    designation: z.string().optional().nullable(),
    mobile: z
      .string()
      .regex(/^[0-9]{10}$/, 'Mobile must be 10 digits')
      .optional()
      .or(z.literal(''))
      .nullable(),
    email: z.string().email('Invalid email address').optional().or(z.literal('')).nullable(),

    // Digital Presence
    website: z.string().url('Must be a valid URL').optional().or(z.literal('')).nullable(),
    website_quality: z.string().optional().nullable(),
    developed_by: z.string().optional().nullable(),
    linkedin_url: z.string().url('Must be a valid URL').optional().or(z.literal('')).nullable(),
    instagram_url: z.string().url('Must be a valid URL').optional().or(z.literal('')).nullable(),
    facebook_url: z.string().url('Must be a valid URL').optional().or(z.literal('')).nullable(),
    youtube_url: z.string().url('Must be a valid URL').optional().or(z.literal('')).nullable(),
    google_business_profile_url: z.string().url('Must be a valid URL').optional().or(z.literal('')).nullable(),
    brochure_url: z.string().optional().nullable(),

    // Sales Attribution & Status
    lead_source: z.string().min(1, 'Lead source is required').default('Cold calling'),
    lead_by_id: z.coerce.number({ required_error: 'Lead By (Sales User) is required' }),
    service_fit: z.string().min(1, 'Service fit is required'),
    status: z.string().min(1, 'Status is required').default('New'),
  })
  .refine(
    (data) => {
      if (data.is_gidc) {
        return Boolean(data.gidc_name && data.gidc_name.trim().length > 0);
      }
      return true;
    },
    {
      message: 'GIDC Name is required when company is in GIDC',
      path: ['gidc_name'],
    }
  );

export type LeadFormData = z.infer<typeof leadFormSchema>;
