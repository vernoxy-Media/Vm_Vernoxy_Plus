import { MasterLookupRepositoryPort, MasterLookupItem } from '../ports/master-lookup.repository.port';
import { ValidationDomainError, NotFoundDomainError } from '../../domain/errors/master-data.errors';
import { LOOKUP_PARENT_RULES } from './create-lookup.use-case';

export interface UpdateLookupInput {
  id: number;
  label?: string;
  code?: string;
  sort_order?: number;
  is_active?: boolean;
  parent_id?: number | null;
  actor_id: number;
}

export class UpdateLookupUseCase {
  constructor(private readonly repo: MasterLookupRepositoryPort) {}

  async execute(input: UpdateLookupInput): Promise<MasterLookupItem> {
    const existing = await this.repo.getById(input.id);
    if (!existing) {
      throw new NotFoundDomainError(`Lookup item with id ${input.id} not found`, 'NOT_FOUND', 'id');
    }

    if (input.label !== undefined && !(input.label || '').trim()) {
      throw new ValidationDomainError('Label cannot be empty', 'VALIDATION_ERROR', 'label');
    }

    if (input.parent_id) {
      const parentType = LOOKUP_PARENT_RULES[existing.lookup_type];
      if (!parentType) {
        throw new ValidationDomainError('This list does not have a parent', 'VALIDATION_ERROR', 'parent_id');
      }
      const parent = await this.repo.getById(input.parent_id);
      if (!parent || parent.lookup_type !== parentType) {
        throw new ValidationDomainError('Pick a valid parent', 'VALIDATION_ERROR', 'parent_id');
      }
    }

    return this.repo.update({
      id: input.id,
      label: input.label,
      code: input.code,
      sort_order: input.sort_order,
      is_active: input.is_active,
      parent_id: input.parent_id,
      actor_id: input.actor_id,
    });
  }
}
