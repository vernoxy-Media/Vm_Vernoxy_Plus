import { IndustryRepositoryPort, IndustryOption } from '../ports/industry.repository.port';

export class GetIndustryOptionsUseCase {
  constructor(private readonly industryRepo: IndustryRepositoryPort) {}

  async execute(parentId?: number): Promise<IndustryOption[]> {
    return this.industryRepo.getOptions(parentId);
  }
}
