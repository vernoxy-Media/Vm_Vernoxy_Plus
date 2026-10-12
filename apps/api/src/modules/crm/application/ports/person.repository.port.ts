import { Person } from '../../domain/entities/person.entity';

export interface PersonLinkedCompany {
  company_id: number;
  name: string;
}

export interface PersonLookupMatch {
  person_id: number;
  name: string;
  email: string | null;
  mobile: string | null;
  linked_companies: PersonLinkedCompany[];
}

export interface CreatePersonData {
  name: string;
  email?: string | null;
  mobile?: string | null;
  linkedin_url?: string | null;
  created_by: number;
}

export interface PersonRepositoryPort {
  findById(id: number, tx?: any): Promise<Person | null>;
  findByEmail(email: string, tx?: any): Promise<Person | null>;
  findByMobile(mobile: string, tx?: any): Promise<Person | null>;
  lookupByEmailOrMobile(email?: string, mobile?: string): Promise<PersonLookupMatch[]>;
  create(data: CreatePersonData, tx?: any): Promise<Person>;
}

export const PERSON_REPOSITORY_PORT_TOKEN = Symbol('PersonRepositoryPort');
