export interface IndustryCatalogItem {
  industry_id: number;
  name: string;
  parent_id: number | null;
  is_active: boolean;
}

export interface IndustryCatalogPort {
  findIndustryById(id: number): Promise<IndustryCatalogItem | null>;
}

export const INDUSTRY_CATALOG_PORT_TOKEN = Symbol('IndustryCatalogPort');
