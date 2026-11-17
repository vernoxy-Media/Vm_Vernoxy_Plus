import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { SaveDraftInput, TemplateRecord, TemplateRepository } from '../../application/ports/template.repository.port';
import { nextVersion, templateCode } from '../../domain/template-rules';

const COLUMNS = Prisma.sql`t.template_id, t.code, t.name, t.document_type, t.version, t.status, t.layout_json, t.content_html,
  COALESCE(t.updated_at, t.created_at) AS updated_at, t.approved_at, a.name AS approved_by_name`;

const iso = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString() : null);

function toRecord(r: any): TemplateRecord {
  return {
    template_id: Number(r.template_id),
    code: r.code,
    name: r.name,
    document_type: r.document_type,
    version: Number(r.version) || 1,
    status: r.status,
    layout: r.layout_json ?? null,
    source: r.content_html ?? '',
    updated_at: iso(r.updated_at),
    approved_at: iso(r.approved_at),
    approved_by_name: r.approved_by_name ?? null,
  };
}

@Injectable()
export class PrismaTemplateRepository implements TemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findDraft(documentType: string): Promise<TemplateRecord | null> {
    const [r] = await this.prisma.$queryRaw<any[]>`
      SELECT ${COLUMNS} FROM document_templates t LEFT JOIN employees a ON a.emp_id = t.approved_by
      WHERE t.document_type = ${documentType} AND t.status = 'DRAFT' LIMIT 1;
    `;
    return r ? toRecord(r) : null;
  }

  async findApproved(documentType: string): Promise<TemplateRecord | null> {
    const [r] = await this.prisma.$queryRaw<any[]>`
      SELECT ${COLUMNS} FROM document_templates t LEFT JOIN employees a ON a.emp_id = t.approved_by
      WHERE t.document_type = ${documentType} AND t.status = 'APPROVED' AND COALESCE(t.is_active, true)
      ORDER BY t.version DESC, COALESCE(t.updated_at, t.created_at) DESC LIMIT 1;
    `;
    return r ? toRecord(r) : null;
  }

  async saveDraft(input: SaveDraftInput): Promise<TemplateRecord> {
    const layout = JSON.stringify(input.layout);
    await this.prisma.$transaction(async (tx) => {
      const [draft] = await tx.$queryRaw<any[]>`
        SELECT template_id FROM document_templates WHERE document_type = ${input.documentType} AND status = 'DRAFT' FOR UPDATE;
      `;
      if (draft) {
        await tx.$executeRaw`
          UPDATE document_templates
          SET layout_json = ${layout}::jsonb, content_html = ${input.source}, updated_at = clock_timestamp(), updated_by = ${input.actorId}
          WHERE template_id = ${draft.template_id};
        `;
        return;
      }
      const versions = await tx.$queryRaw<Array<{ version: number }>>`
        SELECT version FROM document_templates WHERE document_type = ${input.documentType};
      `;
      const version = nextVersion(versions.map((v) => Number(v.version)));
      await tx.$executeRaw`
        INSERT INTO document_templates (code, name, document_type, description, content_html, is_active, status, version, layout_json, created_by, updated_by, updated_at)
        VALUES (${templateCode(input.documentType, version)}, ${input.name}, ${input.documentType},
                ${`Editable ${input.name} template, version ${version}.`}, ${input.source}, false, 'DRAFT', ${version},
                ${layout}::jsonb, ${input.actorId}, ${input.actorId}, clock_timestamp());
      `;
    });
    return (await this.findDraft(input.documentType))!;
  }

  async discardDraft(documentType: string): Promise<boolean> {
    // A draft never made a document, so nothing refers to it.
    const n = await this.prisma.$executeRaw`DELETE FROM document_templates WHERE document_type = ${documentType} AND status = 'DRAFT';`;
    return n > 0;
  }

  async approveDraft(documentType: string, actorId: number): Promise<TemplateRecord | null> {
    const approved = await this.prisma.$transaction(async (tx) => {
      const [draft] = await tx.$queryRaw<any[]>`
        SELECT template_id FROM document_templates WHERE document_type = ${documentType} AND status = 'DRAFT' FOR UPDATE;
      `;
      if (!draft) return false;
      // Older versions (including the first fixed-HTML template) stop making documents.
      await tx.$executeRaw`
        UPDATE document_templates SET status = 'RETIRED', is_active = false, updated_at = clock_timestamp(), updated_by = ${actorId}
        WHERE document_type = ${documentType} AND status = 'APPROVED';
      `;
      await tx.$executeRaw`
        UPDATE document_templates
        SET status = 'APPROVED', is_active = true, approved_by = ${actorId}, approved_at = clock_timestamp(),
            updated_at = clock_timestamp(), updated_by = ${actorId}
        WHERE template_id = ${draft.template_id};
      `;
      return true;
    });
    return approved ? this.findApproved(documentType) : null;
  }
}
