import { Inject, Injectable } from '@nestjs/common';
import { normalizeLayout } from '../../domain/layout';
import { TEMPLATE_TOKENS } from '../ports/tokens';
import { TemplateRepository } from '../ports/template.repository.port';
import { DocumentComposer } from '../services/document-composer';
import { requireKind } from './template-editor.use-cases';

export interface RenderedDocument {
  html: string;
  template_id: number;
  version: number;
}

/**
 * A real document from the APPROVED template, with the source frozen at approval.
 * Returns null while no layout template has been approved yet: the caller keeps using its older
 * fixed-HTML template until then.
 */
@Injectable()
export class RenderDocumentUseCase {
  constructor(
    @Inject(TEMPLATE_TOKENS.Repository) private readonly repo: TemplateRepository,
    private readonly composer: DocumentComposer,
  ) {}

  async execute<T>(kindKey: string, data: T): Promise<RenderedDocument | null> {
    const kind = requireKind(kindKey);
    const approved = await this.repo.findApproved(kind.kind);
    if (!approved || !approved.layout) return null;
    const layout = normalizeLayout(kind.catalog, approved.layout);
    return {
      html: this.composer.compose(kind, layout, data, approved.source),
      template_id: approved.template_id,
      version: approved.version,
    };
  }
}
