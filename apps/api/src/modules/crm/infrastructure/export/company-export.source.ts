import { Injectable, Inject, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  DataTransferJob,
  ExportSource,
  SpreadsheetCellNormalizer,
} from '../../../data-transfer/public-api';
import * as ExcelJS from 'exceljs';
import { stringify } from 'csv-stringify';

import { CompanyExportFilters } from '../../domain/entities/company-export-filters';
export { CompanyExportFilters };

@Injectable()
export class CompanyExportSource implements ExportSource {
  readonly entityType = 'companies';
  private static readonly DEFAULT_MAX_COMPANIES = 100000;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private getMaxCompaniesCap(): number {
    const val = process.env.EXPORT_MAX_COMPANIES;
    if (val && !isNaN(Number(val))) {
      return Number(val);
    }
    return CompanyExportSource.DEFAULT_MAX_COMPANIES;
  }

  private buildWhereClause(filters: CompanyExportFilters): {
    whereSql: string;
    params: any[];
  } {
    const conditions: string[] = ['c.deleted_at IS NULL'];
    const params: any[] = [];
    let pIdx = 1;

    if (filters.is_active !== undefined) {
      conditions.push(`c.is_active = $${pIdx++}`);
      params.push(filters.is_active);
    }

    if (filters.customer_type_id !== undefined) {
      conditions.push(`c.customer_type_id = $${pIdx++}`);
      params.push(filters.customer_type_id);
    }

    if (filters.industry_id !== undefined) {
      conditions.push(
        `(c.industry_id = $${pIdx} OR c.sub_industry_id = $${pIdx})`,
      );
      pIdx++;
      params.push(filters.industry_id);
    }

    if (filters.owner === 'unassigned') {
      conditions.push(`c.owner_id IS NULL`);
    } else if (filters.owner_id !== undefined) {
      conditions.push(`c.owner_id = $${pIdx++}`);
      params.push(filters.owner_id);
    }

    if (filters.q && filters.q.trim().length >= 2) {
      conditions.push(`c.name ILIKE '%' || $${pIdx++} || '%'`);
      params.push(filters.q.trim());
    }

    return {
      whereSql: conditions.join(' AND '),
      params,
    };
  }

  async countMatching(filters: CompanyExportFilters): Promise<number> {
    const { whereSql, params } = this.buildWhereClause(filters);
    const cap = this.getMaxCompaniesCap();

    // Bounded count query: does not count past cap + 1
    const countSql = `
      SELECT COUNT(*)::int as c FROM (
        SELECT 1 FROM companies c
        WHERE ${whereSql}
        LIMIT ${cap + 1}
      ) t;
    `;

    const rows: any[] = await this.prisma.$queryRawUnsafe(countSql, ...params);
    const count = rows[0]?.c ?? 0;

    if (count > cap) {
      throw new UnprocessableEntityException({
        code: 'EXPORT_TOO_LARGE',
        message: `Export matches ${count > cap ? 'more than ' + cap : count} companies. The limit is ${cap}. Please narrow your filters.`,
      });
    }

    return count;
  }

  async streamExport(
    job: DataTransferJob,
    format: 'xlsx' | 'csv',
    filters: CompanyExportFilters,
    outputStream: NodeJS.WritableStream,
  ): Promise<{ totalRows: number }> {
    const { whereSql, params } = this.buildWhereClause(filters);
    const batchSize = 1000;

    if (format === 'csv') {
      return await this.streamCsvExport(whereSql, params, batchSize, outputStream);
    } else {
      return await this.streamXlsxExport(whereSql, params, batchSize, outputStream);
    }
  }

  private async streamCsvExport(
    whereSql: string,
    params: any[],
    batchSize: number,
    outputStream: NodeJS.WritableStream,
  ): Promise<{ totalRows: number }> {
    // Write UTF-8 BOM
    outputStream.write(Buffer.from([0xef, 0xbb, 0xbf]));

    const columns = [
      { key: 'company_id', header: 'company_id' },
      { key: 'company_ref', header: 'company_ref' },
      { key: 'name', header: 'name' },
      { key: 'parent_company_ref', header: 'parent_company_ref' },
      { key: 'customer_type', header: 'customer_type' },
      { key: 'industry', header: 'industry' },
      { key: 'sub_industry', header: 'sub_industry' },
      { key: 'address', header: 'address' },
      { key: 'city', header: 'city' },
      { key: 'state', header: 'state' },
      { key: 'country', header: 'country' },
      { key: 'owner_email', header: 'owner_email' },
      { key: 'website', header: 'website' },
      { key: 'linkedin', header: 'linkedin' },
      { key: 'facebook', header: 'facebook' },
      { key: 'instagram', header: 'instagram' },
      { key: 'x', header: 'x' },
      { key: 'email', header: 'email' },
      { key: 'phone', header: 'phone' },
      { key: 'whatsapp', header: 'whatsapp' },
      { key: 'status', header: 'status' },
    ];

    const stringifier = stringify({
      header: true,
      columns,
      record_delimiter: 'windows',
      quoted: true,
    });

    stringifier.pipe(outputStream);

    let lastLowerName: string | null = null;
    let lastId: number | null = null;
    let totalRows = 0;

    while (true) {
      const batchParams = [...params];
      let cursorCondition = '';
      let pIdx = batchParams.length + 1;

      if (lastLowerName !== null && lastId !== null) {
        cursorCondition = ` AND (lower(c.name) > lower($${pIdx}) OR (lower(c.name) = lower($${pIdx}) AND c.company_id > $${pIdx + 1}))`;
        batchParams.push(lastLowerName, lastId);
        pIdx += 2;
      }

      batchParams.push(batchSize);
      const limitParam = `$${pIdx}`;

      const sql = `
        SELECT
          c.company_id,
          c.name,
          c.address,
          c.city,
          c.state,
          c.country,
          c.is_active,
          parent.name AS parent_name,
          ct.name AS customer_type_name,
          ind.name AS industry_name,
          sub.name AS sub_industry_name,
          emp.email AS owner_email
        FROM companies c
        JOIN customer_types ct ON c.customer_type_id = ct.customer_type_id
        JOIN industries ind ON c.industry_id = ind.industry_id
        LEFT JOIN industries sub ON c.sub_industry_id = sub.industry_id
        LEFT JOIN companies parent ON c.parent_company_id = parent.company_id
        LEFT JOIN employees emp ON c.owner_id = emp.emp_id
        WHERE ${whereSql} ${cursorCondition}
        ORDER BY lower(c.name) ASC, c.company_id ASC
        LIMIT ${limitParam};
      `;

      const companies: any[] = await this.prisma.$queryRawUnsafe(sql, ...batchParams);
      if (companies.length === 0) break;

      const companyIds = companies.map((c) => c.company_id);

      // Fetch primary channels in batch
      const channels: any[] = await this.prisma.$queryRaw`
        SELECT company_id, channel_type, value
        FROM company_channels
        WHERE company_id = ANY(${companyIds}::int[])
          AND is_primary = true
          AND deleted_at IS NULL;
      `;

      const channelsByCompany = new Map<number, Record<string, string>>();
      for (const ch of channels) {
        if (!channelsByCompany.has(ch.company_id)) {
          channelsByCompany.set(ch.company_id, {});
        }
        channelsByCompany.get(ch.company_id)![ch.channel_type] = ch.value;
      }

      for (const comp of companies) {
        totalRows++;
        const compCh = channelsByCompany.get(comp.company_id) || {};
        const row = {
          company_id: comp.company_id,
          company_ref: `REF-${comp.company_id}`,
          name: SpreadsheetCellNormalizer.applyInjectionPrefix(comp.name || ''),
          parent_company_ref: SpreadsheetCellNormalizer.applyInjectionPrefix(comp.parent_name || ''),
          customer_type: comp.customer_type_name || '',
          industry: comp.industry_name || '',
          sub_industry: comp.sub_industry_name || '',
          address: SpreadsheetCellNormalizer.applyInjectionPrefix(comp.address || ''),
          city: SpreadsheetCellNormalizer.applyInjectionPrefix(comp.city || ''),
          state: SpreadsheetCellNormalizer.applyInjectionPrefix(comp.state || ''),
          country: SpreadsheetCellNormalizer.applyInjectionPrefix(comp.country || ''),
          owner_email: comp.owner_email || '',
          website: SpreadsheetCellNormalizer.applyInjectionPrefix(compCh['website'] || ''),
          linkedin: SpreadsheetCellNormalizer.applyInjectionPrefix(compCh['linkedin'] || ''),
          facebook: SpreadsheetCellNormalizer.applyInjectionPrefix(compCh['facebook'] || ''),
          instagram: SpreadsheetCellNormalizer.applyInjectionPrefix(compCh['instagram'] || ''),
          x: SpreadsheetCellNormalizer.applyInjectionPrefix(compCh['x'] || ''),
          email: SpreadsheetCellNormalizer.applyInjectionPrefix(compCh['email'] || ''),
          phone: SpreadsheetCellNormalizer.applyInjectionPrefix(compCh['phone'] || ''),
          whatsapp: SpreadsheetCellNormalizer.applyInjectionPrefix(compCh['whatsapp'] || ''),
          status: comp.is_active ? 'Active' : 'Inactive',
        };

        stringifier.write(row);
      }

      const lastComp = companies[companies.length - 1];
      lastLowerName = lastComp.name.toLowerCase();
      lastId = lastComp.company_id;

      if (companies.length < batchSize) break;
    }

    stringifier.end();
    await new Promise<void>((resolve, reject) => {
      stringifier.on('finish', () => resolve());
      stringifier.on('error', reject);
    });

    return { totalRows };
  }

  private async streamXlsxExport(
    whereSql: string,
    params: any[],
    batchSize: number,
    outputStream: NodeJS.WritableStream,
  ): Promise<{ totalRows: number }> {
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: outputStream as any,
      useStyles: true,
      useSharedStrings: false,
    });

    // 1. Companies Sheet
    const wsCompanies = workbook.addWorksheet('Companies', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    const companyHeaders = [
      'company_id',
      'company_ref',
      'name',
      'parent_company_ref',
      'customer_type',
      'industry',
      'sub_industry',
      'address',
      'city',
      'state',
      'country',
      'owner_email',
      'website',
      'linkedin',
      'facebook',
      'instagram',
      'x',
      'email',
      'phone',
      'whatsapp',
      'status',
    ];
    const compHeadRow = wsCompanies.getRow(1);
    compHeadRow.font = { bold: true };
    companyHeaders.forEach((h, idx) => {
      compHeadRow.getCell(idx + 1).value = h;
    });
    compHeadRow.commit();

    // 2. Channels Sheet (non-primary)
    const wsChannels = workbook.addWorksheet('Channels', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    const channelHeaders = [
      'company_ref',
      'channel_type',
      'value',
      'label',
      'is_primary',
    ];
    const chanHeadRow = wsChannels.getRow(1);
    chanHeadRow.font = { bold: true };
    channelHeaders.forEach((h, idx) => {
      chanHeadRow.getCell(idx + 1).value = h;
    });
    chanHeadRow.commit();

    // 3. Contacts Sheet
    const wsContacts = workbook.addWorksheet('Contacts', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    const contactHeaders = [
      'company_ref',
      'name',
      'email',
      'mobile',
      'linkedin_url',
      'designation',
      'department',
      'is_primary',
      'reports_to',
    ];
    const contHeadRow = wsContacts.getRow(1);
    contHeadRow.font = { bold: true };
    contactHeaders.forEach((h, idx) => {
      contHeadRow.getCell(idx + 1).value = h;
    });
    contHeadRow.commit();

    let lastLowerName: string | null = null;
    let lastId: number | null = null;
    let totalRows = 0;

    while (true) {
      const batchParams = [...params];
      let cursorCondition = '';
      let pIdx = batchParams.length + 1;

      if (lastLowerName !== null && lastId !== null) {
        cursorCondition = ` AND (lower(c.name) > lower($${pIdx}) OR (lower(c.name) = lower($${pIdx}) AND c.company_id > $${pIdx + 1}))`;
        batchParams.push(lastLowerName, lastId);
        pIdx += 2;
      }

      batchParams.push(batchSize);
      const limitParam = `$${pIdx}`;

      const sql = `
        SELECT
          c.company_id,
          c.name,
          c.address,
          c.city,
          c.state,
          c.country,
          c.is_active,
          parent.name AS parent_name,
          ct.name AS customer_type_name,
          ind.name AS industry_name,
          sub.name AS sub_industry_name,
          emp.email AS owner_email
        FROM companies c
        JOIN customer_types ct ON c.customer_type_id = ct.customer_type_id
        JOIN industries ind ON c.industry_id = ind.industry_id
        LEFT JOIN industries sub ON c.sub_industry_id = sub.industry_id
        LEFT JOIN companies parent ON c.parent_company_id = parent.company_id
        LEFT JOIN employees emp ON c.owner_id = emp.emp_id
        WHERE ${whereSql} ${cursorCondition}
        ORDER BY lower(c.name) ASC, c.company_id ASC
        LIMIT ${limitParam};
      `;

      const companies: any[] = await this.prisma.$queryRawUnsafe(sql, ...batchParams);
      if (companies.length === 0) break;

      const companyIds = companies.map((c) => c.company_id);

      // Fetch all channels for this batch
      const allChannels: any[] = await this.prisma.$queryRaw`
        SELECT company_id, channel_type, value, label, is_primary
        FROM company_channels
        WHERE company_id = ANY(${companyIds}::int[])
          AND deleted_at IS NULL
        ORDER BY is_primary DESC, channel_id ASC;
      `;

      // Fetch all contacts for this batch
      const allContacts: any[] = await this.prisma.$queryRaw`
        SELECT
          cp.company_id,
          cp.company_person_id,
          cp.is_primary,
          cp.designation,
          cp.reports_to_company_person_id,
          p.name,
          p.email,
          p.mobile,
          p.linkedin_url,
          ml.label as department_label
        FROM company_persons cp
        JOIN persons p ON cp.person_id = p.person_id
        LEFT JOIN master_lookup ml ON cp.department_id = ml.lookup_id
        WHERE cp.company_id = ANY(${companyIds}::int[])
          AND cp.deleted_at IS NULL
          AND p.deleted_at IS NULL
        ORDER BY cp.is_primary DESC, cp.company_person_id ASC;
      `;

      const primaryChannelsByComp = new Map<number, Record<string, string>>();
      const nonPrimaryChannelsByComp = new Map<number, any[]>();
      for (const ch of allChannels) {
        if (ch.is_primary) {
          if (!primaryChannelsByComp.has(ch.company_id)) {
            primaryChannelsByComp.set(ch.company_id, {});
          }
          primaryChannelsByComp.get(ch.company_id)![ch.channel_type] = ch.value;
        } else {
          if (!nonPrimaryChannelsByComp.has(ch.company_id)) {
            nonPrimaryChannelsByComp.set(ch.company_id, []);
          }
          nonPrimaryChannelsByComp.get(ch.company_id)!.push(ch);
        }
      }

      const contactsByComp = new Map<number, any[]>();
      const contactById = new Map<number, any>();
      for (const cont of allContacts) {
        if (!contactsByComp.has(cont.company_id)) {
          contactsByComp.set(cont.company_id, []);
        }
        contactsByComp.get(cont.company_id)!.push(cont);
        contactById.set(cont.company_person_id, cont);
      }

      // Write Companies
      for (const comp of companies) {
        totalRows++;
        const prim = primaryChannelsByComp.get(comp.company_id) || {};
        const compRef = `REF-${comp.company_id}`;

        const cRow = wsCompanies.addRow([
          comp.company_id,
          compRef,
          SpreadsheetCellNormalizer.applyInjectionPrefix(comp.name || ''),
          SpreadsheetCellNormalizer.applyInjectionPrefix(comp.parent_name || ''),
          comp.customer_type_name || '',
          comp.industry_name || '',
          comp.sub_industry_name || '',
          SpreadsheetCellNormalizer.applyInjectionPrefix(comp.address || ''),
          SpreadsheetCellNormalizer.applyInjectionPrefix(comp.city || ''),
          SpreadsheetCellNormalizer.applyInjectionPrefix(comp.state || ''),
          SpreadsheetCellNormalizer.applyInjectionPrefix(comp.country || ''),
          comp.owner_email || '',
          SpreadsheetCellNormalizer.applyInjectionPrefix(prim['website'] || ''),
          SpreadsheetCellNormalizer.applyInjectionPrefix(prim['linkedin'] || ''),
          SpreadsheetCellNormalizer.applyInjectionPrefix(prim['facebook'] || ''),
          SpreadsheetCellNormalizer.applyInjectionPrefix(prim['instagram'] || ''),
          SpreadsheetCellNormalizer.applyInjectionPrefix(prim['x'] || ''),
          SpreadsheetCellNormalizer.applyInjectionPrefix(prim['email'] || ''),
          SpreadsheetCellNormalizer.applyInjectionPrefix(prim['phone'] || ''),
          SpreadsheetCellNormalizer.applyInjectionPrefix(prim['whatsapp'] || ''),
          comp.is_active ? 'Active' : 'Inactive',
        ]);
        cRow.commit();

        // Write non-primary channels
        const extraChannels = nonPrimaryChannelsByComp.get(comp.company_id) || [];
        for (const ech of extraChannels) {
          const chRow = wsChannels.addRow([
            compRef,
            ech.channel_type,
            SpreadsheetCellNormalizer.applyInjectionPrefix(ech.value || ''),
            SpreadsheetCellNormalizer.applyInjectionPrefix(ech.label || ''),
            false,
          ]);
          chRow.commit();
        }

        // Write contacts
        const compContacts = contactsByComp.get(comp.company_id) || [];
        for (const cont of compContacts) {
          let reportsTo = '';
          if (cont.reports_to_company_person_id) {
            const manager = contactById.get(cont.reports_to_company_person_id);
            if (manager) {
              reportsTo = manager.email || manager.name;
            }
          }

          const contRow = wsContacts.addRow([
            compRef,
            SpreadsheetCellNormalizer.applyInjectionPrefix(cont.name || ''),
            SpreadsheetCellNormalizer.applyInjectionPrefix(cont.email || ''),
            SpreadsheetCellNormalizer.applyInjectionPrefix(cont.mobile || ''),
            SpreadsheetCellNormalizer.applyInjectionPrefix(cont.linkedin_url || ''),
            SpreadsheetCellNormalizer.applyInjectionPrefix(cont.designation || ''),
            cont.department_label || '',
            cont.is_primary,
            SpreadsheetCellNormalizer.applyInjectionPrefix(reportsTo),
          ]);
          contRow.commit();
        }
      }

      const lastComp = companies[companies.length - 1];
      lastLowerName = lastComp.name.toLowerCase();
      lastId = lastComp.company_id;

      if (companies.length < batchSize) break;
    }

    wsCompanies.commit();
    wsChannels.commit();
    wsContacts.commit();
    await workbook.commit();

    return { totalRows };
  }
}
