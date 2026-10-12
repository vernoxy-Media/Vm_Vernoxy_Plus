import {
  IndustryRepositoryPort,
  ListIndustriesParams,
  IndustryWithCounts,
} from '../ports/industry.repository.port';

export class ListIndustriesUseCase {
  constructor(private readonly industryRepo: IndustryRepositoryPort) {}

  async execute(params: ListIndustriesParams): Promise<{ items: IndustryWithCounts[]; next_cursor: number | null }> {
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);
    return this.industryRepo.list({ ...params, limit });
  }
}
