import { ContactDuplicateMatch } from '../../domain/errors/sales.errors';

export interface ContactRecord {
  company_person_id: number;
  person_id: number;
  company_id: number;
  name: string;
  designation: string | null;
  mobile: string | null;
  email: string | null;
  is_primary: boolean;
  /** false once marked "Left the company": kept in history, not offered in new conversations. */
  is_active: boolean;
}

export interface ContactInput {
  name: string;
  designation: string | null;
  mobile: string | null;
  email: string | null;
}

export interface SalesContactRepositoryPort {
  companyExists(companyId: number): Promise<boolean>;
  list(companyId: number): Promise<ContactRecord[]>;
  get(companyPersonId: number): Promise<ContactRecord | null>;
  findDuplicates(q: { mobile: string | null; email: string | null; exclude_company_id: number; exclude_person_id?: number }): Promise<ContactDuplicateMatch[]>;
  add(companyId: number, input: ContactInput, actorEmpId: number): Promise<ContactRecord>;
  update(companyPersonId: number, input: ContactInput, actorEmpId: number): Promise<ContactRecord>;
  setPrimary(companyPersonId: number, actorEmpId: number): Promise<ContactRecord>;
  markLeft(companyPersonId: number, actorEmpId: number): Promise<ContactRecord>;
  isUsed(companyPersonId: number): Promise<boolean>;
  softDelete(companyPersonId: number, actorEmpId: number): Promise<void>;
}

export const SALES_CONTACT_REPOSITORY_PORT_TOKEN = Symbol('SalesContactRepositoryPort');
