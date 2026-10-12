import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  PersonRepositoryPort,
  PersonLookupMatch,
  CreatePersonData,
} from '../../application/ports/person.repository.port';
import { Person } from '../../domain/entities/person.entity';
import { CrmNormalizationService } from '../../domain/services/crm-normalization.service';

@Injectable()
export class PrismaPersonRepository implements PersonRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: any) {
    return tx || this.prisma;
  }

  async findById(id: number, tx?: any): Promise<Person | null> {
    const client = this.getClient(tx);
    const row = await client.persons.findFirst({
      where: { person_id: id, deleted_at: null },
    });
    if (!row) return null;
    return new Person(
      row.person_id,
      row.name,
      row.email,
      row.mobile,
      row.linkedin_url,
      row.created_at,
      row.created_by,
      row.updated_at,
      row.updated_by,
      row.deleted_at,
      row.deleted_by,
    );
  }

  async findByEmail(email: string, tx?: any): Promise<Person | null> {
    const client = this.getClient(tx);
    const normalized = email.trim().toLowerCase();
    const row = await client.persons.findFirst({
      where: {
        email: { equals: normalized, mode: 'insensitive' },
        deleted_at: null,
      },
    });
    if (!row) return null;
    return new Person(
      row.person_id,
      row.name,
      row.email,
      row.mobile,
      row.linkedin_url,
      row.created_at,
      row.created_by,
      row.updated_at,
      row.updated_by,
      row.deleted_at,
      row.deleted_by,
    );
  }

  async findByMobile(mobile: string, tx?: any): Promise<Person | null> {
    const client = this.getClient(tx);
    const cleaned = mobile.replace(/[\s\-\(\)\[\]]/g, '');
    const row = await client.persons.findFirst({
      where: {
        mobile: cleaned,
        deleted_at: null,
      },
    });
    if (!row) return null;
    return new Person(
      row.person_id,
      row.name,
      row.email,
      row.mobile,
      row.linkedin_url,
      row.created_at,
      row.created_by,
      row.updated_at,
      row.updated_by,
      row.deleted_at,
      row.deleted_by,
    );
  }

  async lookupByEmailOrMobile(email?: string, mobile?: string): Promise<PersonLookupMatch[]> {
    if (!email && !mobile) {
      return [];
    }

    const conditions: any[] = [];
    if (email && email.trim()) {
      try {
        const normEmail = CrmNormalizationService.normalizeEmail(email);
        conditions.push({ email: { equals: normEmail, mode: 'insensitive' } });
      } catch {
        conditions.push({ email: { equals: email.trim().toLowerCase(), mode: 'insensitive' } });
      }
    }
    if (mobile && mobile.trim()) {
      try {
        const normMobile = CrmNormalizationService.normalizePhone(mobile);
        conditions.push({ mobile: normMobile });
      } catch {
        const cleaned = mobile.replace(/[\s\-\(\)\[\]]/g, '');
        conditions.push({ mobile: cleaned });
      }
    }

    if (conditions.length === 0) {
      return [];
    }

    const rows = await this.prisma.persons.findMany({
      where: {
        deleted_at: null,
        OR: conditions,
      },
      take: 5,
      include: {
        company_persons: {
          where: { deleted_at: null },
          include: {
            companies: {
              select: {
                company_id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { person_id: 'asc' },
    });

    return rows.map((r: any) => ({
      person_id: r.person_id,
      name: r.name,
      email: r.email,
      mobile: r.mobile,
      linked_companies: r.company_persons
        .filter((cp: any) => cp.companies)
        .map((cp: any) => ({
          company_id: cp.companies.company_id,
          name: cp.companies.name,
        })),
    }));
  }

  async create(data: CreatePersonData, tx?: any): Promise<Person> {
    const client = this.getClient(tx);
    const row = await client.persons.create({
      data: {
        name: data.name,
        email: data.email || null,
        mobile: data.mobile || null,
        linkedin_url: data.linkedin_url || null,
        created_by: data.created_by,
      },
    });
    return new Person(
      row.person_id,
      row.name,
      row.email,
      row.mobile,
      row.linkedin_url,
      row.created_at,
      row.created_by,
      row.updated_at,
      row.updated_by,
      row.deleted_at,
      row.deleted_by,
    );
  }
}
