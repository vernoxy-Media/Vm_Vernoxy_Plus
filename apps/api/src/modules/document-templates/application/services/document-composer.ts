import { Inject, Injectable } from '@nestjs/common';
import { DocumentLayout } from '../../domain/layout';
import { DocumentKind } from '../../domain/kinds';
import { TEMPLATE_TOKENS } from '../ports/tokens';
import { TemplateEnginePort } from '../ports/template-engine.port';
import { AssetUrlPort } from '../ports/template-asset.port';

/** Layout + data + template source -> finished HTML. The one place documents are put together. */
@Injectable()
export class DocumentComposer {
  constructor(
    @Inject(TEMPLATE_TOKENS.Engine) private readonly engine: TemplateEnginePort,
    @Inject(TEMPLATE_TOKENS.AssetUrls) private readonly urls: AssetUrlPort,
  ) {}

  compose<T>(kind: DocumentKind<T>, layout: DocumentLayout, data: T, source: string): string {
    const url = (id: number | null) => (id ? this.urls.urlFor(id) : '');
    const view = kind.buildView(layout, data, {
      letterheadUrl: url(layout.letterhead_asset_id),
      signatureUrl: url(layout.signature_asset_id),
      images: Object.fromEntries(Object.entries(layout.images ?? {}).map(([key, id]) => [key, url(id)])),
    });
    return this.engine.render(source, view);
  }
}
