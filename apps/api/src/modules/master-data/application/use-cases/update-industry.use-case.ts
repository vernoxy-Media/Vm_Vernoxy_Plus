import { IndustryRepositoryPort } from '../ports/industry.repository.port';
import { Industry } from '../../domain/entities/industry.entity';
import {
  NotFoundDomainError,
  ConflictDomainError,
  UnprocessableDomainError,
} from '../../domain/errors/master-data.errors';

export interface UpdateIndustryInput {
  id: number;
  name?: string;
  is_active?: boolean;
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

    let trimmedName: string | undefined = undefined;
    if (input.name !== undefined) {
      trimmedName = input.name.trim();
      if (trimmedName.toLowerCase() !== existing.name.toLowerCase()) {
        const dup = await this.industryRepo.findByName(trimmedName, existing.parent_id);
        if (dup && dup.industry_id !== existing.industry_id) {
          throw new ConflictDomainError(
            `Industry with name "${trimmedName}" already exists at this level`,
            'DUPLICATE_NAME',
            'name',
          );
        }
      }
    }

    return this.industryRepo.update(input.id, {
      name: trimmedName,
      is_active: input.is_active,
      updated_by: input.updated_by,
    });
  }
}
