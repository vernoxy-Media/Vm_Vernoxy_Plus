import {
  LeadRepositoryPort,
  ListLeadsParams,
  CreateLeadParams,
  UpdateLeadParams,
  UpdateLeadStageParams,
  LeadRecord,
  StageMetrics,
  LeadMastersResult,
} from '../../domain/ports/lead.repository.port';

export class ListLeadsUseCase {
  constructor(private readonly repo: LeadRepositoryPort) {}

  async execute(params: ListLeadsParams): Promise<{ leads: LeadRecord[]; metrics: StageMetrics }> {
    return this.repo.list(params);
  }
}

export class GetLeadDetailUseCase {
  constructor(private readonly repo: LeadRepositoryPort) {}

  async execute(id: number): Promise<LeadRecord | null> {
    return this.repo.getById(id);
  }
}

export class CreateLeadUseCase {
  constructor(private readonly repo: LeadRepositoryPort) {}

  async execute(params: CreateLeadParams, currentEmpId: number): Promise<LeadRecord> {
    return this.repo.create(params, currentEmpId);
  }
}

export class UpdateLeadUseCase {
  constructor(private readonly repo: LeadRepositoryPort) {}

  async execute(id: number, params: UpdateLeadParams, currentEmpId: number): Promise<LeadRecord> {
    return this.repo.update(id, params, currentEmpId);
  }
}

export class UpdateLeadStageUseCase {
  constructor(private readonly repo: LeadRepositoryPort) {}

  async execute(id: number, params: UpdateLeadStageParams, currentEmpId: number): Promise<LeadRecord> {
    return this.repo.updateStage(id, params, currentEmpId);
  }
}

export class ConvertLeadUseCase {
  constructor(private readonly repo: LeadRepositoryPort) {}

  async execute(id: number, currentEmpId: number): Promise<{ message: string; company_id: number; company_name: string; lead: LeadRecord }> {
    return this.repo.convertToCompany(id, currentEmpId);
  }
}

export class DeleteLeadUseCase {
  constructor(private readonly repo: LeadRepositoryPort) {}

  async execute(id: number, currentEmpId: number): Promise<void> {
    return this.repo.delete(id, currentEmpId);
  }
}

export class GetLeadMastersUseCase {
  constructor(private readonly repo: LeadRepositoryPort) {}

  async execute(): Promise<LeadMastersResult> {
    return this.repo.getMasters();
  }
}
