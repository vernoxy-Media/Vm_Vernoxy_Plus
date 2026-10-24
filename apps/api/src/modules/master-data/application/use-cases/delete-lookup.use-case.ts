import { MasterLookupRepositoryPort } from '../ports/master-lookup.repository.port';
import { NotFoundDomainError } from '../../domain/errors/master-data.errors';

export class DeleteLookupUseCase {
  constructor(private readonly repo: MasterLookupRepositoryPort) {}

  async execute(id: number, actorId: number): Promise<void> {
    const existing = await this.repo.getById(id);
    if (!existing) {
      throw new NotFoundDomainError(`Lookup item with id ${id} not found`, 'NOT_FOUND', 'id');
    }

    await this.repo.delete(id, actorId);
  }
}
