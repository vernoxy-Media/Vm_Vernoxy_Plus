import { ImportLookups } from './sales-import.repository.port';

/** Builds the downloadable import template: the 36 columns, and a second sheet with the allowed dropdown values. */
export interface SalesImportTemplatePort {
  build(format: 'xlsx' | 'csv', lookups: ImportLookups): Promise<Buffer>;
}

export const SALES_IMPORT_TEMPLATE_PORT_TOKEN = Symbol('SalesImportTemplatePort');
