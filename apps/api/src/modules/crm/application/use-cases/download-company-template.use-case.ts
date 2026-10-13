import {
  SpreadsheetWriterPort,
  SheetDefinition,
} from '../../../data-transfer/public-api';

export interface MasterTemplateData {
  customerTypes: string[];
  industries: string[];
  statuses: string[];
}

export class DownloadCompanyTemplateUseCase {
  constructor(
    private readonly spreadsheetWriter: SpreadsheetWriterPort,
    private readonly masterDataProvider: () => Promise<MasterTemplateData>,
  ) {}

  async execute(format: 'xlsx' | 'csv'): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const masterData = await this.masterDataProvider();

    const sheets: SheetDefinition[] = [];

    if (format === 'xlsx') {
      // 1. Instructions Sheet
      sheets.push({
        name: 'Instructions',
        headers: [],
        instructionsRows: [
          ['Vernoxy Pulse - Company Import Instructions & Guidelines', null],
          ['Rule', 'Details'],
          ['Required Sheets', 'The "Companies" sheet is required. "Channels" and "Contacts" sheets are optional for XLSX.'],
          ['Mandatory Fields', 'On Companies: "name". On Channels: "company_ref", "channel_type", "value". On Contacts: "company_ref", "name", and either "email" or "mobile".'],
          ['Company Reference', 'company_ref must be unique within the file. Required if the company has extra channels, contacts, or child companies.'],
          ['Quick Channels', 'Columns on the Companies sheet (website, email, phone, etc.) create the PRIMARY channel of that type.'],
          ['Additional Channels', 'The "Channels" sheet adds extra channels. It cannot set is_primary=true for a channel type that already has a primary quick column.'],
          ['Master Data Resolution', 'customer_type, industry, sub_industry, and department are matched case-insensitively against active values. Blank customer_type and industry default automatically.'],
          ['Parent Companies', 'parent_company_ref matches another company_ref in this file, or the exact name of an existing company.'],
          ['Status Values', 'status accepts: Active, Inactive, Yes, No, True, False, 1, 0 (defaults to Active).'],
          ['Formula Injection Safe', 'Cells starting with =, +, -, @ are safely handled and sanitized.'],
          [null, null],
          ['Example - Companies (do not import)', 'company_ref: COMP-01 | name: Acme Corp | customer_type: Client | industry: Manufacturing | city: Surat | email: contact@acme.com'],
          ['Example - Channels (do not import)', 'company_ref: COMP-01 | channel_type: phone | value: +919876543210 | label: Support | is_primary: false'],
          ['Example - Contacts (do not import)', 'company_ref: COMP-01 | name: John Doe | email: john@acme.com | mobile: +919876543211 | is_primary: true'],
        ],
      });
    }

    // 2. Companies Sheet
    sheets.push({
      name: 'Companies',
      headers: [
        { key: 'company_ref', header: 'company_ref', width: 16 },
        { key: 'name', header: 'name*', width: 25 },
        { key: 'parent_company_ref', header: 'parent_company_ref', width: 20 },
        { key: 'customer_type', header: 'customer_type', width: 18 },
        { key: 'industry', header: 'industry', width: 22 },
        { key: 'sub_industry', header: 'sub_industry', width: 22 },
        { key: 'address', header: 'address', width: 25 },
        { key: 'city', header: 'city', width: 16 },
        { key: 'state', header: 'state', width: 16 },
        { key: 'country', header: 'country', width: 16 },
        { key: 'owner_email', header: 'owner_email', width: 25 },
        { key: 'website', header: 'website', width: 25 },
        { key: 'linkedin', header: 'linkedin', width: 25 },
        { key: 'facebook', header: 'facebook', width: 25 },
        { key: 'instagram', header: 'instagram', width: 25 },
        { key: 'x', header: 'x', width: 25 },
        { key: 'email', header: 'email', width: 25 },
        { key: 'phone', header: 'phone', width: 18, isPhone: true },
        { key: 'whatsapp', header: 'whatsapp', width: 18, isPhone: true },
        { key: 'status', header: 'status', width: 14 },
      ],
      dropdowns: [
        { column: 'customer_type', values: masterData.customerTypes },
        { column: 'industry', values: masterData.industries },
        { column: 'status', values: masterData.statuses },
      ],
    });

    if (format === 'xlsx') {
      // 3. Channels Sheet
      sheets.push({
        name: 'Channels',
        headers: [
          { key: 'company_ref', header: 'company_ref*', width: 18 },
          { key: 'channel_type', header: 'channel_type*', width: 18 },
          { key: 'value', header: 'value*', width: 28 },
          { key: 'label', header: 'label', width: 18 },
          { key: 'is_primary', header: 'is_primary', width: 14 },
        ],
        dropdowns: [
          {
            column: 'channel_type',
            values: ['website', 'facebook', 'instagram', 'x', 'linkedin', 'email', 'phone', 'whatsapp'],
          },
          { column: 'is_primary', values: ['true', 'false'] },
        ],
      });

      // 4. Contacts Sheet
      sheets.push({
        name: 'Contacts',
        headers: [
          { key: 'company_ref', header: 'company_ref*', width: 18 },
          { key: 'name', header: 'name*', width: 22 },
          { key: 'email', header: 'email', width: 25 },
          { key: 'mobile', header: 'mobile', width: 18, isPhone: true },
          { key: 'linkedin_url', header: 'linkedin_url', width: 25 },
          { key: 'designation', header: 'designation', width: 20 },
          { key: 'department', header: 'department', width: 20 },
          { key: 'is_primary', header: 'is_primary', width: 14 },
          { key: 'reports_to', header: 'reports_to', width: 25 },
        ],
        dropdowns: [{ column: 'is_primary', values: ['true', 'false'] }],
      });
    }

    const buffer = await this.spreadsheetWriter.buildTemplateBuffer(sheets, format);
    const filename = `companies-template.${format}`;
    const contentType =
      format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv; charset=utf-8';

    return { buffer, filename, contentType };
  }
}
