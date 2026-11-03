/** Company fields from the Sales Fields sheet (BFD section 4, Part 3). */
export interface CompanyFields {
  name: string;
  no_of_branches: number | null;
  no_of_plants: number | null;
  full_address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pin: string | null;
  google_maps_url: string | null;
  is_gidc: boolean;
  gidc_name: string | null;
  gidc_area_phase: string | null;
  nature_of_business: string | null;
  /** Industry master value (name). Resolved to industries.industry_id by the repository. */
  industry: string | null;
  products_services: string | null;
  estimated_employees: number | null;
  estimated_turnover: number | null;
  year_established: number | null;
  existing_major_clients: string | null;
  website: string | null;
  website_quality: string | null;
  developed_by: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  youtube_url: string | null;
  google_business_profile_url: string | null;
}

export interface ContactFields {
  name: string | null;
  designation: string | null;
  mobile: string | null;
  email: string | null;
}

export const WEBSITE_QUALITIES = ['Good', 'Average', 'Poor', 'No Website'] as const;

/** Lead stages that count as an "open" lead (BFD section 6, "One open lead"). */
export const OPEN_LEAD_STAGES = ['New', 'Contacted', 'Qualified', 'On Hold'] as const;
