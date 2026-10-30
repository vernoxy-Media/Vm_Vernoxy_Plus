export interface Employee {
  emp_id: number;
  name: string;
  email: string;
  mob: string;
  dep_id: number;
  role_id: number | null;
  reporting_manager: number | null;
  profile_picture?: string | null;
  profile_picture_url?: string | null;
  status: 'Active' | 'Inactive';
  joining_date: Date;
  exit_date: Date | null;
  created_at: Date;
  created_by: number | null;
  updated_at: Date | null;
  updated_by: number | null;
  deleted_at: Date | null;
  deleted_by: number | null;
  department?: {
    dep_id: number;
    name: string;
  };
  departments?: Array<{
    dep_id: number;
    name: string;
    is_primary: boolean;
  }>;
  role?: {
    role_id: number;
    role_name: string;
  } | null;
  manager?: {
    emp_id: number;
    name: string;
  } | null;
  gender_id?: number | null;
  gender?: {
    lookup_id: number;
    code: string;
    label: string;
  } | null;
  personal_email?: string | null;
  office_email?: string | null;
  birth_date?: Date | null;
  blood_group?: string | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_number?: string | null;
  emergency_contact_relation?: string | null;
  employment_type_id?: number | null;
  employment_type?: {
    lookup_id: number;
    code: string;
    label: string;
  } | null;
  salary?: number | null;
  pf?: number | null;
  termination_date?: Date | null;
  deactivation_reason?: string | null;
  deactivation_notes?: string | null;
  deactivated_at?: Date | null;
  deactivated_by?: number | null;
  employee_code?: string;
  pending_documents_count?: number;
  pay_policy?: {
    salary_effective_from?: Date | null;
    pf_applicable: boolean;
    uan?: string | null;
    employee_pf_pct: number;
    employer_pf_pct: number;
    ot_eligible: boolean;
    ot_rate_type?: 'FIXED' | 'MULTIPLIER' | null;
    ot_rate?: number | null;
    ot_multiplier?: number | null;
    minimum_ot_per_day: number;
    ot_paid_as: 'SALARY' | 'COMP_OFF';
    payment_mode?: 'BANK_TRANSFER' | 'CHEQUE' | 'CASH' | null;
    bank_name?: string | null;
    account_number?: string | null;
    ifsc_code?: string | null;
  } | null;
  ot_eligible?: boolean;
  ot_rate_type?: 'FIXED' | 'MULTIPLIER' | null;
  ot_rate?: number | null;
  ot_multiplier?: number | null;
  minimum_ot_per_day?: number;
  ot_paid_as?: 'SALARY' | 'COMP_OFF';
  pf_applicable?: boolean;
  uan?: string | null;
  employee_pf_pct?: number;
  employer_pf_pct?: number;
  payment_mode?: 'BANK_TRANSFER' | 'CHEQUE' | 'CASH' | null;
  bank_name?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
}

