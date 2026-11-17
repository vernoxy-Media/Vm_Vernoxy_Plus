import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { normalizeLayout } from '../../domain/layout';
import { BundledImages } from '../services/bundled-images';
import { TEMPLATE_TOKENS } from '../ports/tokens';
import { TemplateRepository } from '../ports/template.repository.port';
import { TemplateSourcePort } from '../ports/template-source.port';
import { DocumentComposer } from '../services/document-composer';
import { DocumentDataRegistry } from '../services/document-data.registry';
import { requireKind } from './template-editor.use-cases';

export interface PreviewInput {
  /** Unsaved layout from the editor; omitted -> the draft, else the approved version, else defaults. */
  layout?: unknown;
  /**
   * Which data the test document shows. Salary Slip: { year, month, emp_id } (real payroll).
   * Quotation: the typed-in details. Omitted -> sample data.
   */
  subject?: Record<string, unknown> | null;
}

/**
 * Test document: shown and printed only; never saved, numbered or sent.
 * Uses the template source of this version of Pulse, so the Admin sees what approving would give.
 */
@Injectable()
export class PreviewDocumentUseCase {
  constructor(
    @Inject(TEMPLATE_TOKENS.Repository) private readonly repo: TemplateRepository,
    @Inject(TEMPLATE_TOKENS.Sources) private readonly sources: TemplateSourcePort,
    private readonly composer: DocumentComposer,
    private readonly registry: DocumentDataRegistry,
    private readonly images: BundledImages,
  ) {}

  async execute(kindKey: string, input: PreviewInput): Promise<{ html: string; sample_data: boolean }> {
    const kind = requireKind(kindKey);
    const source = this.sources.sourceFor(kind.kind);
    if (!source) throw new ConflictException(`The ${kind.name} template has no source in this version of Pulse.`);

    let layout;
    if (input.layout !== undefined && input.layout !== null) layout = normalizeLayout(kind.catalog, input.layout);
    else {
      const stored = (await this.repo.findDraft(kind.kind))?.layout ?? (await this.repo.findApproved(kind.kind))?.layout ?? null;
      layout = stored ? normalizeLayout(kind.catalog, stored) : await this.images.startingLayout(kind.catalog);
    }

    const subject = input.subject && Object.keys(input.subject).length ? input.subject : null;
    let data: unknown;
    if (subject) {
      // A registered source (the module that owns the data) wins; kinds whose details can be typed in
      // use the typed values until such a source exists.
      const sourceOfData = this.registry.get(kind.kind);
      if (sourceOfData) data = await sourceOfData.load(subject);
      else if (kind.dataFrom) data = kind.dataFrom(subject);
      else throw new ConflictException(`Real data is not available for ${kind.name} test documents yet.`);
    } else data = kind.sampleData();

    return { html: this.composer.compose(kind, layout, data, source), sample_data: !subject };
  }
}
