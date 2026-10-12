import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  CompanyRepositoryPort,
  ListCompaniesParams,
  CompanyListItem,
  CompanyOption,
  CompanyDuplicateMatch,
  CompanyDetail,
} from '../../application/ports/company.repository.port';
import { Company } from '../../domain/entities/company.entity';
import { CrmNormalizationService } from '../../domain/services/crm-normalization.service';

@Injectable()
export class PrismaCompanyRepository implements CompanyRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: any) {
    return tx || this.prisma;
  }

  async findById(id: number, tx?: any): Promise<Company | null> {
    const client = this.getClient(tx);
    const row = await client.companies.findFirst({
      where: { company_id: id, deleted_at: null },
    });
    if (!row) return null;
    return new Company(
      row.company_id,
      row.name,
      row.customer_type_id,
      row.industry_id,
      row.sub_industry_id,
      row.parent_company_id,
      row.address,
      row.city,
      row.state,
      row.country,
      row.owner_id,
      row.is_active,
      row.created_at,
      row.created_by,
      row.updated_at,
      row.updated_by,
      row.deleted_at,
      row.deleted_by,
    );
  }

  async hasActiveChildren(id: number, tx?: any): Promise<boolean> {
    const client = this.getClient(tx);
    const count = await client.companies.count({
      where: { parent_company_id: id, deleted_at: null },
    });
    return count > 0;
  }

  async hasActiveLeads(id: number, tx?: any): Promise<boolean> {
    const client = this.getClient(tx);
    const count = await client.leads.count({
      where: {
        company_id: id,
        deleted_at: null,
        status: { in: ['open', 'on_hold'] },
      },
    });
    return count > 0;
  }

  async list(params: ListCompaniesParams): Promise<{ items: CompanyListItem[]; next_cursor: string | null }> {
    const limit = Math.min(Math.max(params.limit || 50, 1), 100);

    const conditions: string[] = ['c.deleted_at IS NULL'];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (params.is_active !== undefined) {
      conditions.push(`c.is_active = $${paramIndex++}`);
      queryParams.push(params.is_active);
    }

    if (params.customer_type_id !== undefined) {
      conditions.push(`c.customer_type_id = $${paramIndex++}`);
      queryParams.push(params.customer_type_id);
    }

    if (params.industry_id !== undefined) {
      conditions.push(`(c.industry_id = $${paramIndex} OR c.sub_industry_id = $${paramIndex})`);
      paramIndex++;
      queryParams.push(params.industry_id);
    }

    if (params.owner === 'unassigned') {
      conditions.push(`c.owner_id IS NULL`);
    } else if (params.owner_id !== undefined) {
      conditions.push(`c.owner_id = $${paramIndex++}`);
      queryParams.push(params.owner_id);
    }

    if (params.q && params.q.trim().length >= 2) {
      conditions.push(`c.name ILIKE '%' || $${paramIndex++} || '%'`);
      queryParams.push(params.q.trim());
    }

    // Keyset cursor on lower(name), company_id
    if (params.cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(params.cursor, 'base64').toString('utf-8'));
        if (decoded && typeof decoded.name === 'string' && typeof decoded.id === 'number') {
          conditions.push(`(lower(c.name) > lower($${paramIndex}) OR (lower(c.name) = lower($${paramIndex}) AND c.company_id > $${paramIndex + 1}))`);
          queryParams.push(decoded.name, decoded.id);
          paramIndex += 2;
        }
      } catch {
        // ignore invalid cursor
      }
    }

    const whereClause = conditions.join(' AND ');
    queryParams.push(limit + 1);
    const limitParam = `$${paramIndex}`;

    const sql = `
      SELECT
        c.company_id,
        c.name,
        c.city,
        c.state,
        c.is_active,
        json_build_object('id', ct.customer_type_id, 'name', ct.name) AS customer_type,
        json_build_object('id', ind.industry_id, 'name', ind.name) AS industry,
        CASE WHEN sub.industry_id IS NOT NULL THEN json_build_object('id', sub.industry_id, 'name', sub.name) ELSE NULL END AS sub_industry,
        CASE WHEN emp.emp_id IS NOT NULL THEN json_build_object('emp_id', emp.emp_id, 'name', emp.name) ELSE NULL END AS owner,
        chan_email.value AS primary_email,
        chan_phone.value AS primary_phone,
        COALESCE(cc.contact_count, 0)::int AS contact_count
      FROM companies c
      JOIN customer_types ct ON c.customer_type_id = ct.customer_type_id
      JOIN industries ind ON c.industry_id = ind.industry_id
      LEFT JOIN industries sub ON c.sub_industry_id = sub.industry_id
      LEFT JOIN employees emp ON c.owner_id = emp.emp_id
      LEFT JOIN LATERAL (
        SELECT value FROM company_channels
        WHERE company_id = c.company_id AND channel_type = 'email' AND is_primary = true AND deleted_at IS NULL
        LIMIT 1
      ) chan_email ON true
      LEFT JOIN LATERAL (
        SELECT value FROM company_channels
        WHERE company_id = c.company_id AND channel_type IN ('phone', 'whatsapp') AND is_primary = true AND deleted_at IS NULL
        LIMIT 1
      ) chan_phone ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS contact_count FROM company_persons
        WHERE company_id = c.company_id AND deleted_at IS NULL
      ) cc ON true
      WHERE ${whereClause}
      ORDER BY lower(c.name) ASC, c.company_id ASC
      LIMIT ${limitParam}
    `;

    const rawRows = await this.prisma.$queryRawUnsafe<any[]>(sql, ...queryParams);

    let next_cursor: string | null = null;
    const itemsToReturn = rawRows.slice(0, limit);

    if (rawRows.length > limit) {
      const last = itemsToReturn[itemsToReturn.length - 1];
      next_cursor = Buffer.from(JSON.stringify({ name: last.name, id: last.company_id })).toString('base64');
    }

    return {
      items: itemsToReturn,
      next_cursor,
    };
  }

  async getOptions(params: { q?: string; exclude_id?: number }): Promise<CompanyOption[]> {
    const queryParams: any[] = [];
    let excludeClause = '';
    let searchClause = '';
    let paramIdx = 1;

    if (params.exclude_id !== undefined) {
      excludeClause = `AND company_id NOT IN (
        WITH RECURSIVE descendants AS (
          SELECT company_id FROM companies WHERE company_id = $${paramIdx++}
          UNION ALL
          SELECT c.company_id FROM companies c
          JOIN descendants d ON c.parent_company_id = d.company_id
          WHERE c.deleted_at IS NULL
        )
        SELECT company_id FROM descendants
      )`;
      queryParams.push(params.exclude_id);
    }

    if (params.q && params.q.trim()) {
      searchClause = `AND name ILIKE '%' || $${paramIdx++} || '%'`;
      queryParams.push(params.q.trim());
    }

    const sql = `
      SELECT company_id AS id, name, city
      FROM companies
      WHERE deleted_at IS NULL AND is_active = true
        ${excludeClause}
        ${searchClause}
      ORDER BY lower(name) ASC
      LIMIT 20
    `;

    const rows = await this.prisma.$queryRawUnsafe<any[]>(sql, ...queryParams);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      city: r.city,
    }));
  }

  async checkDuplicates(params: { name?: string; email?: string; phone?: string; website?: string }): Promise<CompanyDuplicateMatch[]> {
    const matchesMap = new Map<number, CompanyDuplicateMatch>();

    // 1. Check by Name (exact or trigram >= 0.7)
    if (params.name && params.name.trim()) {
      const trimmedName = params.name.trim();
      const sql = `
        SELECT company_id, name, city,
          CASE
            WHEN lower(name) = lower($1) THEN 'Exact name match'
            ELSE 'Similar name match (' || round((similarity(name, $1) * 100)::numeric, 0) || '%)'
          END AS reason
        FROM companies
        WHERE deleted_at IS NULL
          AND (lower(name) = lower($1) OR similarity(name, $1) >= 0.7)
        ORDER BY similarity(name, $1) DESC
        LIMIT 5
      `;
      const rows = await this.prisma.$queryRawUnsafe<any[]>(sql, trimmedName);
      for (const r of rows) {
        matchesMap.set(r.company_id, {
          company_id: r.company_id,
          name: r.name,
          city: r.city,
          reason: r.reason,
        });
      }
    }

    // 2. Check by channels (email, phone, website)
    const channelChecks: Array<{ type: string; val: string; label: string }> = [];
    if (params.email && params.email.trim()) {
      try {
        channelChecks.push({
          type: 'email',
          val: CrmNormalizationService.normalizeEmail(params.email),
          label: 'Channel email match',
        });
      } catch {
        channelChecks.push({
          type: 'email',
          val: params.email.trim().toLowerCase(),
          label: 'Channel email match',
        });
      }
    }
    if (params.phone && params.phone.trim()) {
      try {
        channelChecks.push({
          type: 'phone',
          val: CrmNormalizationService.normalizePhone(params.phone),
          label: 'Channel phone match',
        });
      } catch {
        const cleaned = params.phone.replace(/[\s\-\(\)\[\]]/g, '');
        channelChecks.push({
          type: 'phone',
          val: cleaned,
          label: 'Channel phone match',
        });
      }
    }
    if (params.website && params.website.trim()) {
      try {
        channelChecks.push({
          type: 'website',
          val: CrmNormalizationService.normalizeUrl(params.website),
          label: 'Channel website match',
        });
      } catch {
        channelChecks.push({
          type: 'website',
          val: params.website.trim(),
          label: 'Channel website match',
        });
      }
    }

    for (const ch of channelChecks) {
      if (matchesMap.size >= 5) break;
      const sql = `
        SELECT c.company_id, c.name, c.city
        FROM companies c
        JOIN company_channels cc ON c.company_id = cc.company_id
        WHERE c.deleted_at IS NULL AND cc.deleted_at IS NULL
          AND cc.value = $1
        LIMIT 5
      `;
      const rows = await this.prisma.$queryRawUnsafe<any[]>(sql, ch.val);
      for (const r of rows) {
        if (!matchesMap.has(r.company_id)) {
          matchesMap.set(r.company_id, {
            company_id: r.company_id,
            name: r.name,
            city: r.city,
            reason: ch.label,
          });
        }
      }
    }

    return Array.from(matchesMap.values()).slice(0, 5);
  }

  async getDetail(id: number): Promise<CompanyDetail | null> {
    const sql = `
      SELECT
        c.company_id,
        c.name,
        c.address,
        c.city,
        c.state,
        c.country,
        c.is_active,
        c.created_at,
        c.updated_at,
        json_build_object('id', ct.customer_type_id, 'name', ct.name) AS customer_type,
        json_build_object('id', ind.industry_id, 'name', ind.name) AS industry,
        CASE WHEN sub.industry_id IS NOT NULL THEN json_build_object('id', sub.industry_id, 'name', sub.name) ELSE NULL END AS sub_industry,
        CASE WHEN p.company_id IS NOT NULL THEN json_build_object('id', p.company_id, 'name', p.name) ELSE NULL END AS parent,
        COALESCE((
          SELECT json_agg(json_build_object('id', ch.company_id, 'name', ch.name) ORDER BY ch.name)
          FROM companies ch
          WHERE ch.parent_company_id = c.company_id AND ch.deleted_at IS NULL
        ), '[]'::json) AS children,
        CASE WHEN emp.emp_id IS NOT NULL THEN json_build_object('emp_id', emp.emp_id, 'name', emp.name) ELSE NULL END AS owner,
        COALESCE((
          SELECT json_agg(json_build_object(
            'channel_id', cch.channel_id,
            'channel_type', cch.channel_type,
            'value', cch.value,
            'label', cch.label,
            'is_primary', cch.is_primary
          ) ORDER BY cch.is_primary DESC, cch.channel_id ASC)
          FROM company_channels cch
          WHERE cch.company_id = c.company_id AND cch.deleted_at IS NULL
        ), '[]'::json) AS channels,
        COALESCE((
          SELECT json_agg(json_build_object(
            'company_person_id', cp.company_person_id,
            'person_id', per.person_id,
            'name', per.name,
            'email', per.email,
            'mobile', per.mobile,
            'linkedin_url', per.linkedin_url,
            'designation', cp.designation,
            'department', CASE WHEN dep.lookup_id IS NOT NULL THEN json_build_object('id', dep.lookup_id, 'label', dep.label) ELSE NULL END,
            'is_primary', cp.is_primary,
            'reports_to_company_person_id', cp.reports_to_id,
            'linked_company_count', (
              SELECT COUNT(*)::int FROM company_persons cp_other
              WHERE cp_other.person_id = per.person_id AND cp_other.deleted_at IS NULL
            )
          ) ORDER BY cp.is_primary DESC, cp.company_person_id ASC)
          FROM company_persons cp
          JOIN persons per ON cp.person_id = per.person_id
          LEFT JOIN master_lookup dep ON cp.department_id = dep.lookup_id AND dep.lookup_type = 'person_department'
          WHERE cp.company_id = c.company_id AND cp.deleted_at IS NULL
        ), '[]'::json) AS contacts
      FROM companies c
      JOIN customer_types ct ON c.customer_type_id = ct.customer_type_id
      JOIN industries ind ON c.industry_id = ind.industry_id
      LEFT JOIN industries sub ON c.sub_industry_id = sub.industry_id
      LEFT JOIN companies p ON c.parent_company_id = p.company_id
      LEFT JOIN employees emp ON c.owner_id = emp.emp_id
      WHERE c.company_id = $1 AND c.deleted_at IS NULL
    `;

    const rows = await this.prisma.$queryRawUnsafe<any[]>(sql, id);
    if (!rows || rows.length === 0) return null;
    const r = rows[0];

    return {
      company_id: r.company_id,
      name: r.name,
      customer_type: r.customer_type,
      industry: r.industry,
      sub_industry: r.sub_industry,
      parent: r.parent,
      children: r.children || [],
      address: r.address,
      city: r.city,
      state: r.state,
      country: r.country,
      owner: r.owner,
      is_active: r.is_active,
      created_at: r.created_at,
      updated_at: r.updated_at,
      channels: r.channels || [],
      contacts: r.contacts || [],
    };
  }
}
