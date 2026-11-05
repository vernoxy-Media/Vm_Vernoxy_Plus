import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

export interface SheetSpec {
  name: string;
  title?: string;
  columns: Array<{ header: string; key: string; width?: number; money?: boolean }>;
  rows: Array<Record<string, any>>;
}

/** Excel for "Export" on the Expense Claims list and Expense Reports (BFD 6, 11). */
@Injectable()
export class ExpenseExportService {
  async workbook(sheets: SheetSpec[]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Vernoxy Pulse';
    for (const s of sheets) {
      const ws = wb.addWorksheet(s.name.slice(0, 31));
      let headerRow = 1;
      if (s.title) {
        ws.addRow([s.title]).font = { bold: true, size: 13 };
        ws.addRow([]);
        headerRow = 3;
      }
      ws.addRow(s.columns.map((c) => c.header));
      const head = ws.getRow(headerRow);
      head.font = { bold: true };
      head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      s.columns.forEach((c, i) => {
        ws.getColumn(i + 1).width = c.width ?? Math.max(12, c.header.length + 2);
        if (c.money) ws.getColumn(i + 1).numFmt = '#,##,##0.00';
      });
      for (const r of s.rows) ws.addRow(s.columns.map((c) => r[c.key] ?? ''));
      ws.views = [{ state: 'frozen', ySplit: headerRow }];
    }
    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}
