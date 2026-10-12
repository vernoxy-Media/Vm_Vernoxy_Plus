import { Injectable, Inject } from '@nestjs/common';
import {
  IndustryCatalogPort,
  IndustryCatalogItem,
} from '../../application/ports/industry-catalog.port';
import {
  CustomerTypeCatalogPort,
  CustomerTypeCatalogItem,
} from '../../application/ports/customer-type-catalog.port';
import {
  MASTER_DATA_PUBLIC_API_TOKEN,
  MasterDataPublicApi,
} from '../../../master-data/public-api';

@Injectable()
export class MasterDataCatalogAdapter implements IndustryCatalogPort, CustomerTypeCatalogPort {
  constructor(
    @Inject(MASTER_DATA_PUBLIC_API_TOKEN)
    private readonly masterDataPublicApi: MasterDataPublicApi,
  ) {}

  async findIndustryById(id: number): Promise<IndustryCatalogItem | null> {
    const item = await this.masterDataPublicApi.findIndustryById(id);
    if (!item) return null;
    return {
      industry_id: item.industry_id,
      name: item.name,
      parent_id: item.parent_id,
      is_active: item.is_active,
    };
  }

  async findCustomerTypeById(id: number): Promise<CustomerTypeCatalogItem | null> {
    const item = await this.masterDataPublicApi.findCustomerTypeById(id);
    if (!item) return null;
    return {
      customer_type_id: item.customer_type_id,
      name: item.name,
      is_active: item.is_active,
    };
  }
}
