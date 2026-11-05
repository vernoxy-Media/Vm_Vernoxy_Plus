import { z } from 'zod';

export const companyFormSchema = z
  .object({
    // Basic
    name: z.string().trim().min(1, 'Company name is required'),
    year_established: z
      .union([z.string(), z.number()])
      .optional()
      .transform((val) => (val ? Number(val) : null)),
    estimated_turnover: z
      .union([z.string(), z.number()])
      .optional()
      .transform((val) => (val ? Number(val) : null)),
    estimated_employees: z
      .union([z.string(), z.number()])
      .optional()
      .transform((val) => (val ? Number(val) : null)),
    no_of_branches: z
      .union([z.string(), z.number()])
      .optional()
      .transform((val) => (val ? Number(val) : null)),
    no_of_plants: z
      .union([z.string(), z.number()])
      .optional()
      .transform((val) => (val ? Number(val) : null)),

    // Address
    full_address: z.string().optional().default(''),
    city: z.string().optional().default(''),
    state: z.string().optional().default(''),
    pin: z.string().optional().default(''),
    country: z.string().optional().default('India'),
    google_maps_url: z.string().optional().default(''),
    is_gidc: z.boolean().default(false),
    gidc_name: z.string().optional().default(''),
    gidc_area_phase: z.string().optional().default(''),

    // Business
    industry: z.string().optional().default(''),
    nature_of_business: z.string().optional().default(''),
    products_services: z.string().optional().default(''),
    existing_major_clients: z.string().optional().default(''),
    brochure_url: z.string().optional().default(''),

    // Online presence
    website: z.string().optional().default(''),
    website_quality: z.string().optional().default(''),
    developed_by: z.string().optional().default(''),
    linkedin_url: z.string().optional().default(''),
    instagram_url: z.string().optional().default(''),
    facebook_url: z.string().optional().default(''),
    youtube_url: z.string().optional().default(''),
    google_business_profile_url: z.string().optional().default(''),

    // Primary Contact (Optional)
    contact_name: z.string().optional().default(''),
    contact_designation: z.string().optional().default(''),
    contact_email: z.string().optional().default(''),
    contact_mobile: z.string().optional().default(''),
  })
  .superRefine((data, ctx) => {
    if (data.is_gidc) {
      if (!data.gidc_name || !data.gidc_name.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'GIDC name is required when GIDC is enabled',
          path: ['gidc_name'],
        });
      }
      if (!data.gidc_area_phase || !data.gidc_area_phase.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'GIDC Area / Phase is required when GIDC is enabled',
          path: ['gidc_area_phase'],
        });
      }
    }

    if (data.contact_email && data.contact_email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.contact_email.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please enter a valid email address',
          path: ['contact_email'],
        });
      }
    }
  });

export type CompanyFormValues = z.infer<typeof companyFormSchema>;
