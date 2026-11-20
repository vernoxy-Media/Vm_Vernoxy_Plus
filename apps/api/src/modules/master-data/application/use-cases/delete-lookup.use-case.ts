import { MasterLookupRepositoryPort } from '../ports/master-lookup.repository.port';
import { ConflictDomainError, NotFoundDomainError } from '../../domain/errors/master-data.errors';

export class DeleteLookupUseCase {
  constructor(private readonly repo: MasterLookupRepositoryPort) {}

  async execute(id: number, actorId: number): Promise<void> {
    const existing = await this.repo.getById(id);
    if (!existing) {
      throw new NotFoundDomainError(`Lookup item with id ${id} not found`, 'NOT_FOUND', 'id');
    }

    // A state with cities (or a country with states) would leave them pointing at nothing
    const linked = await this.repo.countChildren(id);
    if (linked > 0) {
      throw new ConflictDomainError(
        `${linked} item${linked === 1 ? ' is' : 's are'} linked to "${existing.label}". Move or delete ${linked === 1 ? 'it' : 'them'} first.`,
        'LOOKUP_HAS_CHILDREN',
        'id',
      );
    }

    await this.repo.delete(id, actorId);
  }
}
