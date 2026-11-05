import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ImportLookups } from '../../application/ports/sales-import.repository.port';
import { SalesImportTemplatePort } from '../../application/ports/sales-import-template.port';
import { IMPORT_FIELDS, IMPORT_MAX_ROWS } from '../../domain/entities/import-fields';
import { WEBSITE_QUALITIES } from '../../domain/entities/sales-company';

const INSTRUCTIONS: Array<[string, string]> = [
  ['How to fill this template', ''],
  ['Companies sheet', 'One row per company. Only Company Name is required. Keep the column names as they are, or match them when you upload.'],
  ['Lists sheet', 'The values allowed in the dropdown columns (Industry, Nature of Business, Designation, GIDC Name, GIDC Area/Phase, Lead Source, Lead By, Service Fit, Website Quality).'],
  ['City / State', 'Free text.'],
  ['Is GIDC', 'Yes or No. If Yes, GIDC Name and GIDC Area/Phase are required.'],
  ['Contact', 'Contact Person is needed when Mobile or Email is given. Mobile is 10 digits.'],
  ['Lead', 'Fill Lead Source, Lead By and Service Fit together to also create a New lead for the company. Service Fit can have several values separated by a comma.'],
  ['Date Added, Status', 'Set by the system. Whatever you write here is ignored.'],
  ['Brochure', 'Cannot be imported. Upload it from the company page.'],
  ['Limits', `Up to ${IMPORT_MAX_ROWS} rows and 5 MB per file.`],
];

/** The list columns of the Lists sheet, and the Companies column each one feeds. */
const LISTS: Array<{ title: string; key: string; values: (l: ImportLookups) => string[] }> = [
  { title: 'Industry', key: 'industry', values: (l) => [...l.industries.values()].map((i) => i.name).sort() },
  { title: 'Nature of Business', key: 'nature_of_business', values: (l) => [...l.nature_of_business.values()].sort() },
  { title: 'Designation', key: 'designation', values: (l) => [...l.designation.values()].sort() },
  { title: 'GIDC Name', key: 'gidc_name', values: (l) => [...l.gidc_names.values()].sort() },
  { title: 'GIDC Area/Phase', key: 'gidc_area_phase', values: (l) => [...l.gidc_areas.values()].sort() },
  { title: 'Lead Source', key: 'lead_source', values: (l) => [...l.lead_sources.values()].map((s) => s.label).sort() },
  { title: 'Lead By', key: 'lead_by', values: (l) => l.users.map((u) => u.name).sort() },
  { title: 'Service Fit', key: 'service_fit', values: (l) => [...l.service_fits.values()].sort() },
  { title: 'Website Quality', key: 'website_quality', values: () => [...WEBSITE_QUALITIES] },
  { title: 'Is GIDC', key: 'is_gidc', values: () => ['Yes', 'No'] },
];
/** Service Fit takes several values, so it is listed but not forced as a dropdown. */
const NO_DROPDOWN = new Set(['service_fit']);

@Injectable()
export class ExcelJsSalesImportTemplateAdapter implements SalesImportTemplatePort {
  async build(format: 'xlsx' | 'csv', lookups: ImportLookups): Promise<Buffer> {
    if (format === 'csv') {
      return Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(IMPORT_FIELDS.map((f) => f.header).join(',') + '\r\n', 'utf8')]);
    }
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Vernoxy Pulse';
    wb.created = new Date();

    const ws = wb.addWorksheet('Companies');
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    IMPORT_FIELDS.forEach((f, i) => {
      const col = ws.getColumn(i + 1);
      col.header = f.required ? `${f.header}` : f.header;
      col.width = Math.max(f.header.length + 4, 18);
      if (f.key === 'mobile' || f.key === 'pin') col.numFmt = '@';
    });
    const head = ws.getRow(1);
    head.font = { bold: true };
    head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

    const lists = wb.addWorksheet('Lists');
    LISTS.forEach((l, i) => {
      const values = l.values(lookups);
      lists.getCell(1, i + 1).value = l.title;
      lists.getCell(1, i + 1).font = { bold: true };
      lists.getColumn(i + 1).width = Math.max(l.title.length + 4, 22);
      values.forEach((v, r) => (lists.getCell(r + 2, i + 1).value = v));
      const target = IMPORT_FIELDS.findIndex((f) => f.key === l.key);
      if (target < 0 || NO_DROPDOWN.has(l.key) || values.length === 0) return;
      const letter = ws.getColumn(target + 1).letter;
      const listLetter = lists.getColumn(i + 1).letter;
      const range = `Lists!$${listLetter}$2:$${listLetter}$${values.length + 1}`;
      for (let r = 2; r <= IMPORT_MAX_ROWS + 1; r++) {
        ws.getCell(`${letter}${r}`).dataValidation = { type: 'list', allowBlank: true, showErrorMessage: false, formulae: [range] };
      }
    });

    const ins = wb.addWorksheet('Instructions');
    INSTRUCTIONS.forEach((r) => ins.addRow(r));
    ins.getColumn(1).width = 28;
    ins.getColumn(2).width = 100;
    ins.getRow(1).font = { bold: true, size: 14 };

    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}
