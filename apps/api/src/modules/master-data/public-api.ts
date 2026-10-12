import { Injectable, Inject } from '@nestjs/common';
import {
  IndustryRepositoryPort,
  INDUSTRY_REPOSITORY_PORT,
} from './application/ports/industry.repository.port';
import {
  CustomerTypeRepositoryPort,
  CUSTOMER_TYPE_REPOSITORY_PORT,
} from './application/ports/customer-type.repository.port';

export interface IndustryPublicItem {
  industry_id: number;
  name: string;
  parent_id: number | null;
  is_active: boolean;
  is_default: boolean;
}

export interface CustomerTypePublicItem {
  customer_type_id: number;
  name: string;
  is_active: boolean;
  is_default: boolean;
}

export interface MasterDataPublicApi {
  findIndustryById(id: number): Promise<IndustryPublicItem | null>;
  findCustomerTypeById(id: number): Promise<CustomerTypePublicItem | null>;
}

export const MASTER_DATA_PUBLIC_API_TOKEN = Symbol('MasterDataPublicApi');

@Injectable()
export class MasterDataPublicApiService implements MasterDataPublicApi {
  constructor(
    @Inject(INDUSTRY_REPOSITORY_PORT)
    private readonly industryRepo: IndustryRepositoryPort,
    @Inject(CUSTOMER_TYPE_REPOSITORY_PORT)
    private readonly customerTypeRepo: CustomerTypeRepositoryPort,
  ) {}

  async findIndustryById(id: number): Promise<IndustryPublicItem | null> {
    const ind = await this.industryRepo.findById(id);
    if (!ind) return null;
    return {
      industry_id: ind.industry_id,
      name: ind.name,
      parent_id: ind.parent_id ?? null,
      is_active: ind.is_active,
      is_default: ind.is_default,
    };
  }

  async findCustomerTypeById(id: number): Promise<CustomerTypePublicItem | null> {
    const ct = await this.customerTypeRepo.findById(id);
    if (!ct) return null;
    return {
      customer_type_id: ct.customer_type_id,
      name: ct.name,
      is_active: ct.is_active,
      is_default: ct.is_default,
    };
  }
}
