import { DocumentLayout, LayoutCatalog } from '../layout';
import { ViewContext } from './view-context';
import { SALARY_SLIP_CATALOG, SALARY_SLIP_KIND } from './salary-slip/salary-slip.catalog';
import { SalarySlipData, sampleSalarySlipData } from './salary-slip/salary-slip.data';
import { buildSalarySlipView } from './salary-slip/salary-slip.view';
import { QUOTATION_CATALOG, QUOTATION_KIND } from './quotation/quotation.catalog';
import { QuotationData, quotationDataFrom, sampleQuotationData } from './quotation/quotation.data';
import { buildQuotationView } from './quotation/quotation.view';

/**
 * Every document kind the template module can lay out. A new kind is a new folder with its catalog,
 * data shape, sample data and view builder, plus one entry here.
 */
export interface DocumentKind<TData = unknown> {
  kind: string;
  /** Shown in Template Management. */
  name: string;
  catalog: LayoutCatalog;
  sampleData(): TData;
  /**
   * Kinds whose details can be typed in (test values in Template Management): turns that input into
   * the kind's data. Kinds without it get their real data only from a registered data source.
   */
  dataFrom?(input: Record<string, unknown>): TData;
  buildView(layout: DocumentLayout, data: TData, ctx: ViewContext): object;
}

export const SALARY_SLIP: DocumentKind<SalarySlipData> = {
  kind: SALARY_SLIP_KIND,
  name: 'Salary Slip',
  catalog: SALARY_SLIP_CATALOG,
  sampleData: sampleSalarySlipData,
  buildView: buildSalarySlipView,
};

export const QUOTATION: DocumentKind<QuotationData> = {
  kind: QUOTATION_KIND,
  name: 'Quotation',
  catalog: QUOTATION_CATALOG,
  sampleData: sampleQuotationData,
  dataFrom: (input) => quotationDataFrom(input),
  buildView: buildQuotationView,
};

const KINDS: ReadonlyArray<DocumentKind<any>> = [SALARY_SLIP, QUOTATION];

export function documentKind(kind: string): DocumentKind<any> | undefined {
  return KINDS.find((k) => k.kind === kind);
}

export function documentKinds(): ReadonlyArray<DocumentKind<any>> {
  return KINDS;
}

export type { ViewContext } from './view-context';
