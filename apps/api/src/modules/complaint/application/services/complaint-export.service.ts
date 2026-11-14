import { BadRequestException, Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

export interface ComplaintSheet {
  title?: string;
  sheet?: string;
  columns: Array<{ header: string; key: string; money?: boolean }>;
  rows: Array<Record<string, any>>;
}

/**
 * Excel for "Export" on the Complaints list, Complaint History and Complaint Reports (BFD 5, 8, 11).
 * The screen sends what it shows, so the export always matches the screen. Confidential subjects are
 * never on the screen, so they are never exported.
 */
@Injectable()
export class ComplaintExportService {
  async workbook(spec: ComplaintSheet): Promise<Buffer> {
    const columns = (spec.columns || []).slice(0, 40);
    const rows = (spec.rows || []).slice(0, 20_000);
    if (!columns.length) throw new BadRequestException('Nothing to export.');
    if (columns.some((c) => /^description$/i.test(c.key))) {
      throw new BadRequestException('Complaint descriptions are never exported.');
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Vernoxy Pulse';
    const ws = wb.addWorksheet((spec.sheet || 'Complaints').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31));
    let headerRow = 1;
    if (spec.title) {
      ws.addRow([String(spec.title).slice(0, 200)]).font = { bold: true, size: 13 };
      ws.addRow([]);
      headerRow = 3;
    }
    ws.addRow(columns.map((c) => String(c.header).slice(0, 80)));
    const head = ws.getRow(headerRow);
    head.font = { bold: true };
    head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    columns.forEach((c, i) => {
      ws.getColumn(i + 1).width = Math.max(12, Math.min(48, String(c.header).length + 4));
      if (c.money) ws.getColumn(i + 1).numFmt = '#,##,##0.00';
    });
    for (const r of rows) {
      ws.addRow(columns.map((c) => {
        const v = r?.[c.key];
        if (v === null || v === undefined) return '';
        if (c.money && v !== '' && Number.isFinite(Number(v))) return Number(v);
        return typeof v === 'object' ? JSON.stringify(v) : v;
      }));
    }
    ws.views = [{ state: 'frozen', ySplit: headerRow }];
    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}
