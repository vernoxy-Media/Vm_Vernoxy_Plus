import { MasterLookupRepositoryPort, MasterLookupItem } from '../ports/master-lookup.repository.port';
import { ValidationDomainError } from '../../domain/errors/master-data.errors';
import { ALLOWED_LOOKUP_TYPES } from './list-lookups.use-case';

export interface CreateLookupInput {
  lookup_type: string;
  label: string;
  code?: string;
  sort_order?: number;
  is_active?: boolean;
  actor_id: number;
}

export class CreateLookupUseCase {
  constructor(private readonly repo: MasterLookupRepositoryPort) {}

  async execute(input: CreateLookupInput): Promise<MasterLookupItem> {
    if (!ALLOWED_LOOKUP_TYPES.includes(input.lookup_type)) {
      throw new ValidationDomainError(
        `Invalid lookup type "${input.lookup_type}"`,
        'INVALID_LOOKUP_TYPE',
        'lookup_type',
      );
    }

    const trimmedLabel = (input.label || '').trim();
    if (!trimmedLabel) {
      throw new ValidationDomainError('Label cannot be empty', 'VALIDATION_ERROR', 'label');
    }

    return this.repo.create({
      lookup_type: input.lookup_type,
      label: trimmedLabel,
      code: input.code,
      sort_order: input.sort_order,
      is_active: input.is_active,
      actor_id: input.actor_id,
    });
  }
}
