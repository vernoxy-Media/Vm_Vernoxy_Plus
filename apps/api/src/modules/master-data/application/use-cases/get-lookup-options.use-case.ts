import {
  MasterLookupRepositoryPort,
  LookupOption,
} from '../ports/master-lookup.repository.port';
import { ValidationDomainError } from '../../domain/errors/master-data.errors';
import { ALLOWED_LOOKUP_TYPES } from './list-lookups.use-case';

export class GetLookupOptionsUseCase {
  constructor(private readonly lookupRepo: MasterLookupRepositoryPort) {}

  async execute(type: string): Promise<LookupOption[]> {
    if (!type || !ALLOWED_LOOKUP_TYPES.includes(type)) {
      throw new ValidationDomainError(
        `Invalid lookup type "${type}". Allowed types are: ${ALLOWED_LOOKUP_TYPES.join(', ')}`,
        'INVALID_LOOKUP_TYPE',
        'type',
      );
    }

    return this.lookupRepo.getOptions(type);
  }
}
