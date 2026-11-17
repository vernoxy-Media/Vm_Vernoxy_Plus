/**
 * What other modules may use from Template Management. Nothing else in this folder is a contract.
 *
 *   - DocumentTemplatesModule: import it into your module.
 *   - RenderDocumentUseCase:   make a real document from the approved template
 *                              (returns null until one is approved: keep your old template until then).
 *   - DocumentDataRegistry:    register where your document's real data comes from (for test documents).
 *   - The Salary Slip contract: its kind key and the data it is made from.
 */
export { DocumentTemplatesModule } from './document-templates.module';
export { RenderDocumentUseCase } from './application/use-cases/render-document.use-case';
export type { RenderedDocument } from './application/use-cases/render-document.use-case';
export { DocumentDataRegistry } from './application/services/document-data.registry';
export type { DocumentDataSource } from './application/ports/document-data.port';
export { SALARY_SLIP_KIND } from './domain/kinds/salary-slip/salary-slip.catalog';
export type { SalarySlipData } from './domain/kinds/salary-slip/salary-slip.data';
