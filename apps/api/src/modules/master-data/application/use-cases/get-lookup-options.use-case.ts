import {
  MasterLookupRepositoryPort,
  LookupOption,
} from '../ports/master-lookup.repository.port';
import { ValidationDomainError } from '../../domain/errors/master-data.errors';

const ALLOWED_LOOKUP_TYPES = new Set(['person_department', 'lead_source', 'lost_reason']);

export class GetLookupOptionsUseCase {
  constructor(private readonly lookupRepo: MasterLookupRepositoryPort) {}

  async execute(type: string): Promise<LookupOption[]> {
    if (!type || !ALLOWED_LOOKUP_TYPES.has(type)) {
      throw new ValidationDomainError(
        `Invalid lookup type "${type}". Allowed types are: person_department, lead_source, lost_reason`,
        'INVALID_LOOKUP_TYPE',
        'type',
      );
    }

    return this.lookupRepo.getOptions(type);
  }
}
