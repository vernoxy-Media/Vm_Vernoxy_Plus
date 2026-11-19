import { IndustryRepositoryPort } from '../ports/industry.repository.port';
import { Industry } from '../../domain/entities/industry.entity';
import {
  NotFoundDomainError,
  ConflictDomainError,
  UnprocessableDomainError,
  ValidationDomainError,
} from '../../domain/errors/master-data.errors';

export interface UpdateIndustryInput {
  id: number;
  name?: string;
  is_active?: boolean;
  /** A new parent (a top-level industry), or null to make it top-level. Undefined keeps it as it is. */
  parent_id?: number | null;
  updated_by: number;
}

export class UpdateIndustryUseCase {
  constructor(private readonly industryRepo: IndustryRepositoryPort) {}

  async execute(input: UpdateIndustryInput): Promise<Industry> {
    const existing = await this.industryRepo.findById(input.id);
    if (!existing || existing.deleted_at) {
      throw new NotFoundDomainError(`Industry with id ${input.id} not found`, 'NOT_FOUND', 'id');
    }

    if (input.is_active === false && existing.is_default) {
      throw new ConflictDomainError(
        'Default industry cannot be deactivated or deleted',
        'DEFAULT_PROTECTED',
        'is_active',
      );
    }

    // If activating a sub-industry, check that parent is active
    if (input.is_active === true && existing.parent_id != null) {
      const parent = await this.industryRepo.findById(existing.parent_id);
      if (!parent || parent.deleted_at || !parent.is_active) {
        throw new UnprocessableDomainError(
          `Sub-industry cannot be activated while its parent industry ${existing.parent_id} is inactive or deleted`,
          'PARENT_INACTIVE',
          'is_active',
        );
      }
    }

    // Moving between levels: validate the new parent the same way a new industry is validated
    const parentChanged = input.parent_id !== undefined && (input.parent_id ?? null) !== (existing.parent_id ?? null);
    const newParentId = parentChanged ? (input.parent_id ?? null) : (existing.parent_id ?? null);
    if (parentChanged) {
      if (existing.is_default) {
        throw new ConflictDomainError('The default industry must stay a top-level industry', 'DEFAULT_PROTECTED', 'parent_id');
      }
      if ((await this.industryRepo.countCompanies(existing.industry_id)) > 0) {
        throw new ConflictDomainError(
          'Companies are using this industry, so it cannot be moved to another level. Change those companies first.',
          'INDUSTRY_IN_USE',
          'parent_id',
        );
      }
      if (newParentId != null) {
        if (newParentId === existing.industry_id) {
          throw new ValidationDomainError('An industry cannot be its own parent', 'VALIDATION_ERROR', 'parent_id');
        }
        const parent = await this.industryRepo.findById(newParentId);
        if (!parent || parent.deleted_at) {
          throw new UnprocessableDomainError(
            `Parent industry ${newParentId} does not exist or is soft-deleted`,
            'PARENT_NOT_FOUND',
            'parent_id',
          );
        }
        if (!parent.isTopLevel) {
          throw new ValidationDomainError(
            'The parent is already a sub-industry. Only 2 levels are allowed.',
            'MAX_LEVELS_EXCEEDED',
            'parent_id',
          );
        }
        if (!parent.is_active) {
          throw new UnprocessableDomainError('Cannot move an industry under an inactive parent', 'PARENT_INACTIVE', 'parent_id');
        }
        if ((await this.industryRepo.countChildren(existing.industry_id)) > 0) {
          throw new ValidationDomainError(
            'This industry has sub-industries, so it cannot become a sub-industry itself. Move its sub-industries first.',
            'MAX_LEVELS_EXCEEDED',
            'parent_id',
          );
        }
      }
    }

    let trimmedName: string | undefined = undefined;
    if (input.name !== undefined) {
      trimmedName = input.name.trim();
    }
    // The name must be free at the level the industry will be on
    const nameToCheck = trimmedName ?? existing.name;
    if (parentChanged || (trimmedName !== undefined && trimmedName.toLowerCase() !== existing.name.toLowerCase())) {
      const dup = await this.industryRepo.findByName(nameToCheck, newParentId);
      if (dup && dup.industry_id !== existing.industry_id) {
        throw new ConflictDomainError(
          `Industry with name "${nameToCheck}" already exists at this level`,
          'DUPLICATE_NAME',
          'name',
        );
      }
    }

    return this.industryRepo.update(input.id, {
      name: trimmedName,
      is_active: input.is_active,
      ...(parentChanged ? { parent_id: newParentId } : {}),
      updated_by: input.updated_by,
    });
  }
}
