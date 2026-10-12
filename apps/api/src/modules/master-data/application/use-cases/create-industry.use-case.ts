import { IndustryRepositoryPort } from '../ports/industry.repository.port';
import { Industry } from '../../domain/entities/industry.entity';
import {
  UnprocessableDomainError,
  ValidationDomainError,
  ConflictDomainError,
} from '../../domain/errors/master-data.errors';

export interface CreateIndustryInput {
  name: string;
  parent_id?: number | null;
  created_by: number;
}

export class CreateIndustryUseCase {
  constructor(private readonly industryRepo: IndustryRepositoryPort) {}

  async execute(input: CreateIndustryInput): Promise<Industry> {
    const trimmedName = (input.name || '').trim();
    if (!trimmedName) {
      throw new ValidationDomainError('Industry name cannot be empty', 'VALIDATION_ERROR', 'name');
    }

    if (input.parent_id != null) {
      const parent = await this.industryRepo.findById(input.parent_id);
      if (!parent || parent.deleted_at) {
        throw new UnprocessableDomainError(
          `Parent industry ${input.parent_id} does not exist or is soft-deleted`,
          'PARENT_NOT_FOUND',
          'parent_id',
        );
      }

      if (!parent.isTopLevel) {
        throw new ValidationDomainError(
          `Parent industry ${input.parent_id} is already a sub-industry. Max 2 levels allowed.`,
          'MAX_LEVELS_EXCEEDED',
          'parent_id',
        );
      }

      if (!parent.is_active) {
        throw new UnprocessableDomainError(
          `Cannot create sub-industry under inactive parent industry ${input.parent_id}`,
          'PARENT_INACTIVE',
          'parent_id',
        );
      }
    }

    // Check duplicate name
    const existing = await this.industryRepo.findByName(trimmedName, input.parent_id);
    if (existing) {
      throw new ConflictDomainError(
        `Industry with name "${trimmedName}" already exists at this level`,
        'DUPLICATE_NAME',
        'name',
      );
    }

    return this.industryRepo.create({
      name: trimmedName,
      parent_id: input.parent_id,
      created_by: input.created_by,
    });
  }
}
