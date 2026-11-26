import * as ExcelJS from 'exceljs';
import { CompanyCallExcelPort } from '../../application/ports/sales-report.repository.port';
import { CompanyCallRow } from '../../domain/services/company-call-report.service';

const IST_MS = 5.5 * 60 * 60 * 1000;

export class ExcelJsCompanyCallReportAdapter implements CompanyCallExcelPort {
  async build(rows: CompanyCallRow[]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Company-wise Calls', { views: [{ state: 'frozen', ySplit: 1 }] });
    sheet.columns = [
      { header: 'Company Name', key: 'company_name', width: 32 },
      { header: 'Contact Person', key: 'contact_person', width: 22 },
      { header: 'Total Calls', key: 'total', width: 12 },
      { header: 'Received', key: 'received', width: 11 },
      { header: 'Not Received', key: 'not_received', width: 14 },
      { header: 'Latest Outcome', key: 'latest_outcome', width: 24 },
      { header: 'Last Call Date', key: 'last_call_date', width: 20, style: { numFmt: 'dd-mmm-yyyy hh:mm AM/PM' } },
      { header: 'Last Call Remark', key: 'last_remark', width: 50, style: { alignment: { wrapText: true, vertical: 'top' } } },
    ];
    // Excel has no time zone, so the date is shifted to read as India time.
    rows.forEach((r) => sheet.addRow({ ...r, last_call_date: new Date(r.last_call_date.getTime() + IST_MS) }));
    sheet.getRow(1).font = { bold: true };
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columns.length } };
    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}
