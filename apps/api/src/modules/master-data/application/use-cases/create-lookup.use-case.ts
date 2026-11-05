import { MasterLookupRepositoryPort, MasterLookupItem } from '../ports/master-lookup.repository.port';
import { ValidationDomainError } from '../../domain/errors/master-data.errors';
import { ALLOWED_LOOKUP_TYPES } from './list-lookups.use-case';

export interface CreateLookupInput {
  lookup_type: string;
  label: string;
  code?: string;
  sort_order?: number;
  is_active?: boolean;
  parent_id?: number | null;
  actor_id: number;
}

/** Which lookup type may have a parent, and what the parent must be. */
export const LOOKUP_PARENT_RULES: Record<string, string> = { gidc_phase: 'gidc_name' };

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

    if (input.parent_id) {
      const parentType = LOOKUP_PARENT_RULES[input.lookup_type];
      if (!parentType) {
        throw new ValidationDomainError('This list does not have a parent', 'VALIDATION_ERROR', 'parent_id');
      }
      const parent = await this.repo.getById(input.parent_id);
      if (!parent || parent.lookup_type !== parentType) {
        throw new ValidationDomainError('Pick a valid parent', 'VALIDATION_ERROR', 'parent_id');
      }
    }

    return this.repo.create({
      lookup_type: input.lookup_type,
      label: trimmedLabel,
      code: input.code,
      sort_order: input.sort_order,
      is_active: input.is_active,
      parent_id: input.parent_id,
      actor_id: input.actor_id,
    });
  }
}
