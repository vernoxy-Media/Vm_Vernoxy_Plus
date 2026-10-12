import { z } from 'zod';

export const channelSchema = z.object({
  channel_id: z.number().optional(),
  channel_type: z.enum(['website', 'email', 'phone', 'whatsapp', 'linkedin']),
  value: z.string().min(1, 'Channel value is required'),
  label: z.string().optional().nullable(),
  is_primary: z.boolean().default(false),
});

export const contactSchema = z.object({
  company_person_id: z.number().optional(),
  person_id: z.number().optional(),
  name: z.string().optional(),
  email: z.string().optional().nullable(),
  mobile: z.string().optional().nullable(),
  linkedin_url: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  department_id: z.number().optional().nullable(),
  is_primary: z.boolean().default(false),
  reports_to_index: z.number().optional().nullable(),
  reports_to_company_person_id: z.number().optional().nullable(),
}).refine(
  (data) => {
    if (data.company_person_id || data.person_id) return true;
    return Boolean(data.name && data.name.trim().length > 0);
  },
  {
    message: 'Contact name is required',
    path: ['name'],
  }
).refine(
  (data) => {
    if (data.company_person_id || data.person_id) return true;
    return Boolean((data.email && data.email.trim()) || (data.mobile && data.mobile.trim()));
  },
  {
    message: 'Either email or mobile is required',
    path: ['email'],
  }
);

export const companyFormSchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters').max(255),
  customer_type_id: z.number({ required_error: 'Customer type is required' }).positive('Customer type is required'),
  industry_id: z.number({ required_error: 'Industry is required' }).positive('Industry is required'),
  sub_industry_id: z.number().optional().nullable(),
  parent_company_id: z.number().optional().nullable(),
  owner_id: z.number().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  channels: z.array(channelSchema).max(20, 'Maximum 20 channels allowed').default([]),
  contacts: z.array(contactSchema).max(50, 'Maximum 50 contacts allowed').default([]),
});

export type CompanyFormData = z.infer<typeof companyFormSchema>;
export type ChannelFormData = z.infer<typeof channelSchema>;
export type ContactFormData = z.infer<typeof contactSchema>;
