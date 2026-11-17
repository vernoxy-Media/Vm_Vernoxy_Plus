import { DocumentLayout } from '../../domain/layout';
import { TemplateStatus } from '../../domain/template-rules';

/** One version of a template, as the application sees it (no database types). */
export interface TemplateRecord {
  template_id: number;
  code: string;
  name: string;
  document_type: string;
  version: number;
  status: TemplateStatus;
  /** null for the older fixed-HTML templates (they print their content_html as it is). */
  layout: unknown | null;
  /** The template source (Mustache) frozen with this version, or the older fixed HTML. */
  source: string;
  updated_at: string | null;
  approved_at: string | null;
  approved_by_name: string | null;
}

export interface SaveDraftInput {
  documentType: string;
  name: string;
  layout: DocumentLayout;
  source: string;
  actorId: number;
}

export interface TemplateRepository {
  findDraft(documentType: string): Promise<TemplateRecord | null>;
  /** The newest active APPROVED version (this is what real documents are made from). */
  findApproved(documentType: string): Promise<TemplateRecord | null>;
  /** Creates the draft (next version) or updates the existing one. */
  saveDraft(input: SaveDraftInput): Promise<TemplateRecord>;
  discardDraft(documentType: string): Promise<boolean>;
  /** Draft -> APPROVED and every older approved version -> RETIRED, in one transaction. */
  approveDraft(documentType: string, actorId: number): Promise<TemplateRecord | null>;
}
