import { IndustryRepositoryPort } from '../ports/industry.repository.port';
import {
  NotFoundDomainError,
  ConflictDomainError,
} from '../../domain/errors/master-data.errors';

export class DeleteIndustryUseCase {
  constructor(private readonly industryRepo: IndustryRepositoryPort) {}

  async execute(id: number, deleted_by: number): Promise<void> {
    const existing = await this.industryRepo.findById(id);
    if (!existing || existing.deleted_at) {
      throw new NotFoundDomainError(`Industry with id ${id} not found`, 'NOT_FOUND', 'id');
    }

    if (existing.is_default) {
      throw new ConflictDomainError(
        'Default industry cannot be deactivated or deleted',
        'DEFAULT_PROTECTED',
      );
    }

    await this.industryRepo.softDelete(id, deleted_by);
  }
}
