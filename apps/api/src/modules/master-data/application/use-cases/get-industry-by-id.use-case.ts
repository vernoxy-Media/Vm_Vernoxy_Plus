import { IndustryRepositoryPort } from '../ports/industry.repository.port';
import { Industry } from '../../domain/entities/industry.entity';
import { NotFoundDomainError } from '../../domain/errors/master-data.errors';

export class GetIndustryByIdUseCase {
  constructor(private readonly industryRepo: IndustryRepositoryPort) {}

  async execute(id: number): Promise<Industry> {
    const industry = await this.industryRepo.findById(id);
    if (!industry || industry.deleted_at) {
      throw new NotFoundDomainError(`Industry with id ${id} not found`, 'NOT_FOUND', 'id');
    }
    return industry;
  }
}
