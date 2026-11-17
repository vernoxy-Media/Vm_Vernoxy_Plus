import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentLayout, LayoutCatalog, normalizeLayout } from '../../domain/layout';
import { BundledImages } from '../services/bundled-images';
import { DocumentKind, documentKind } from '../../domain/kinds';
import { TEMPLATE_TOKENS } from '../ports/tokens';
import { TemplateRecord, TemplateRepository } from '../ports/template.repository.port';
import { TemplateSourcePort } from '../ports/template-source.port';

/**
 * Template Management (Admin): read the editor state, save the draft, throw the draft away, approve it.
 * Approved versions are never edited: saving after an approval starts the next version as a draft.
 */

export interface TemplateVersionInfo {
  template_id: number;
  version: number;
  status: string;
  updated_at: string | null;
  approved_at: string | null;
  approved_by_name: string | null;
}

export interface TemplateEditorState {
  kind: string;
  name: string;
  catalog: LayoutCatalog;
  /** What the editor shows: the draft, else the approved version, else the defaults. */
  layout: DocumentLayout;
  draft: TemplateVersionInfo | null;
  approved: TemplateVersionInfo | null;
  /** An older fixed-HTML template is in use until the first layout template is approved. */
  legacy_in_use: boolean;
}

export function requireKind(kind: string): DocumentKind<any> {
  const k = documentKind(kind);
  if (!k) throw new NotFoundException(`There is no template type "${kind}".`);
  return k;
}

const info = (t: TemplateRecord | null): TemplateVersionInfo | null =>
  t
    ? {
        template_id: t.template_id,
        version: t.version,
        status: t.status,
        updated_at: t.updated_at,
        approved_at: t.approved_at,
        approved_by_name: t.approved_by_name,
      }
    : null;

@Injectable()
export class TemplateEditorUseCases {
  constructor(
    @Inject(TEMPLATE_TOKENS.Repository) private readonly repo: TemplateRepository,
    @Inject(TEMPLATE_TOKENS.Sources) private readonly sources: TemplateSourcePort,
    private readonly images: BundledImages,
  ) {}

  async state(kindKey: string): Promise<TemplateEditorState> {
    const kind = requireKind(kindKey);
    const [draft, approved] = await Promise.all([this.repo.findDraft(kind.kind), this.repo.findApproved(kind.kind)]);
    const stored = draft?.layout ?? approved?.layout ?? null;
    return {
      kind: kind.kind,
      name: kind.name,
      catalog: kind.catalog,
      layout: stored ? normalizeLayout(kind.catalog, stored) : await this.images.startingLayout(kind.catalog),
      draft: info(draft),
      approved: approved?.layout ? info(approved) : null,
      legacy_in_use: Boolean(approved && !approved.layout),
    };
  }

  async saveDraft(kindKey: string, layoutInput: unknown, actorId: number): Promise<TemplateEditorState> {
    const kind = requireKind(kindKey);
    const source = this.sources.sourceFor(kind.kind);
    if (!source) throw new ConflictException(`The ${kind.name} template has no source in this version of Pulse.`);
    await this.repo.saveDraft({
      documentType: kind.kind,
      name: kind.name,
      layout: normalizeLayout(kind.catalog, layoutInput),
      source,
      actorId,
    });
    return this.state(kind.kind);
  }

  async discardDraft(kindKey: string): Promise<TemplateEditorState> {
    const kind = requireKind(kindKey);
    await this.repo.discardDraft(kind.kind);
    return this.state(kind.kind);
  }

  async approve(kindKey: string, actorId: number): Promise<TemplateEditorState> {
    const kind = requireKind(kindKey);
    const draft = await this.repo.findDraft(kind.kind);
    if (!draft) throw new ConflictException('There is no draft to approve. Save your changes first.');
    await this.repo.approveDraft(kind.kind, actorId);
    return this.state(kind.kind);
  }
}
