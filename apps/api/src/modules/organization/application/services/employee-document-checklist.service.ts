import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';

export type ChecklistCategory = 'agreement' | 'given_to_employee' | 'taken_from_employee';

/** One standard employee document, from the employee_document_checklist table. */
export interface ChecklistItem {
  checklist_id: number;
  document_type: string;
  title: string;
  category: ChecklistCategory;
  is_required_for_activation: boolean;
  lock_when_active: boolean;
  /** Pulse generates / handles it by its document_type: it cannot be removed or switched off. */
  is_system: boolean;
  display_order: number;
  is_active: boolean;
}

export interface ChecklistInput {
  title?: string;
  is_required_for_activation?: boolean;
  display_order?: number;
  is_active?: boolean;
}

const COLUMNS = `checklist_id, document_type, title, category, is_required_for_activation, lock_when_active,
  is_system, display_order, is_active`;

/**
 * The standard employee document checklist (Settings -> Employee Documents). It used to be a list in
 * the code (PREDEFINED_DOCS); now the Admin decides which documents every employee has, which of them
 * are required before activation, and their order. Each employee keeps their own rows in
 * employee_documents, made from this checklist.
 */
@Injectable()
export class EmployeeDocumentChecklistService {
  constructor(private readonly prisma: PrismaService) {}

  /** Every item, active ones first by order (inactive ones still give old employee rows their place). */
  async all(): Promise<ChecklistItem[]> {
    return this.prisma.$queryRawUnsafe<ChecklistItem[]>(
      `SELECT ${COLUMNS} FROM employee_document_checklist ORDER BY display_order, checklist_id`,
    );
  }

  /** The list for Settings, with how many employees have each document. */
  async listForSettings() {
    const rows = await this.prisma.$queryRawUnsafe<Array<ChecklistItem & { employees: number }>>(
      `SELECT c.checklist_id, c.document_type, c.title, c.category, c.is_required_for_activation, c.lock_when_active,
              c.is_system, c.display_order, c.is_active,
              (SELECT count(*)::int FROM employee_documents d WHERE d.document_type = c.document_type) AS employees
       FROM employee_document_checklist c
       ORDER BY c.display_order, c.checklist_id`,
    );
    return rows;
  }

  /** A document every new employee gets (always "taken from employee": the letters Pulse makes are fixed). */
  async create(input: ChecklistInput, adminId: number) {
    const title = this.cleanTitle(input.title);
    await this.assertTitleFree(title);
    const base = `doc_${title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) || 'document'}`;
    let documentType = base;
    for (let i = 2; await this.typeTaken(documentType); i++) documentType = `${base}_${i}`;
    const [order] = await this.prisma.$queryRaw<Array<{ next: number }>>`
      SELECT COALESCE(MAX(display_order), 0)::int + 1 AS next FROM employee_document_checklist`;
    const [created] = await this.prisma.$queryRaw<ChecklistItem[]>`
      INSERT INTO employee_document_checklist
        (document_type, title, category, is_required_for_activation, display_order, is_active, created_by)
      VALUES (${documentType}, ${title}, 'taken_from_employee', ${Boolean(input.is_required_for_activation)},
              ${input.display_order ?? order.next}, ${input.is_active ?? true}, ${adminId})
      RETURNING *`;
    return created;
  }

  /**
   * Name, required, order, active. A new name is shown to every employee who has the document. A change
   * of "required" applies to employees still Onboarding (activated employees are past that check).
   */
  async update(checklistId: number, input: ChecklistInput, adminId: number) {
    const current = await this.find(checklistId);
    const title = input.title !== undefined ? this.cleanTitle(input.title) : current.title;
    if (title.toLowerCase() !== current.title.toLowerCase()) await this.assertTitleFree(title, checklistId);
    if (current.is_system && input.is_active === false) {
      throw new BadRequestException({ message: `${current.title} is made by Pulse, so it cannot be switched off.`, field: 'is_active' });
    }
    if (current.lock_when_active && input.is_required_for_activation) {
      throw new BadRequestException({
        message: `${current.title} is only issued when the employee leaves, so it cannot be required for activation.`,
        field: 'is_required_for_activation',
      });
    }
    const required = input.is_required_for_activation ?? current.is_required_for_activation;

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE employee_document_checklist
        SET title = ${title}, is_required_for_activation = ${required},
            display_order = ${input.display_order ?? current.display_order}, is_active = ${input.is_active ?? current.is_active},
            updated_at = clock_timestamp(), updated_by = ${adminId}
        WHERE checklist_id = ${checklistId}`;
      if (title !== current.title) {
        await tx.$executeRaw`UPDATE employee_documents SET title = ${title}, updated_at = NOW() WHERE document_type = ${current.document_type}`;
      }
      if (required !== current.is_required_for_activation) {
        // Onboarding employees only. A newly required document that was not asked for yet is now asked for.
        await tx.$executeRaw`
          UPDATE employee_documents d
          SET is_required_for_activation = ${required},
              is_ticked = CASE WHEN ${required} AND d.status = 'not_ticked' THEN true ELSE d.is_ticked END,
              status    = CASE WHEN ${required} AND d.status = 'not_ticked' THEN 'file_pending' ELSE d.status END,
              updated_at = NOW()
          FROM employees e
          WHERE e.emp_id = d.emp_id AND e.status = 'Onboarding' AND d.document_type = ${current.document_type}`;
      }
    });
    return this.find(checklistId);
  }

  /** Never used: deleted. Employees already have it: switched off (their rows and files stay). */
  async remove(checklistId: number, adminId: number) {
    const current = await this.find(checklistId);
    if (current.is_system) {
      throw new BadRequestException({ message: `${current.title} is made by Pulse, so it cannot be removed.`, field: 'checklist_id' });
    }
    const [used] = await this.prisma.$queryRaw<Array<{ n: number }>>`
      SELECT count(*)::int AS n FROM employee_documents WHERE document_type = ${current.document_type}`;
    if (used.n > 0) {
      await this.prisma.$executeRaw`
        UPDATE employee_document_checklist SET is_active = false, updated_at = clock_timestamp(), updated_by = ${adminId}
        WHERE checklist_id = ${checklistId}`;
      return { deleted: false, deactivated: true };
    }
    await this.prisma.$executeRaw`DELETE FROM employee_document_checklist WHERE checklist_id = ${checklistId}`;
    return { deleted: true, deactivated: false };
  }

  private async find(checklistId: number): Promise<ChecklistItem> {
    const [row] = await this.prisma.$queryRawUnsafe<ChecklistItem[]>(
      `SELECT ${COLUMNS} FROM employee_document_checklist WHERE checklist_id = $1`,
      checklistId,
    );
    if (!row) throw new NotFoundException('Document not found in the checklist.');
    return row;
  }

  private cleanTitle(raw: string | undefined): string {
    const title = String(raw ?? '').trim().replace(/\s+/g, ' ');
    if (!title) throw new BadRequestException({ message: 'Please fill the document name.', field: 'title' });
    if (title.length > 150) throw new BadRequestException({ message: 'Use 150 characters or fewer.', field: 'title' });
    return title;
  }

  private async assertTitleFree(title: string, exceptId?: number) {
    const [clash] = await this.prisma.$queryRaw<Array<{ checklist_id: number }>>`
      SELECT checklist_id FROM employee_document_checklist
      WHERE lower(title) = lower(${title}) AND checklist_id <> ${exceptId ?? 0} LIMIT 1`;
    if (clash) throw new ConflictException({ message: `"${title}" is already in the checklist.`, field: 'title' });
  }

  private async typeTaken(documentType: string): Promise<boolean> {
    const [row] = await this.prisma.$queryRaw<Array<{ n: number }>>`
      SELECT count(*)::int AS n FROM employee_document_checklist WHERE document_type = ${documentType}`;
    return row.n > 0;
  }
}
