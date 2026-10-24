import { MasterLookupRepositoryPort, MasterLookupItem } from '../ports/master-lookup.repository.port';
import { ValidationDomainError, NotFoundDomainError } from '../../domain/errors/master-data.errors';

export interface UpdateLookupInput {
  id: number;
  label?: string;
  code?: string;
  sort_order?: number;
  is_active?: boolean;
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

    return this.repo.update({
      id: input.id,
      label: input.label,
      code: input.code,
      sort_order: input.sort_order,
      is_active: input.is_active,
      actor_id: input.actor_id,
    });
  }
}
