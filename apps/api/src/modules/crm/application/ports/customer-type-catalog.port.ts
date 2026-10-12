export interface CustomerTypeCatalogItem {
  customer_type_id: number;
  name: string;
  is_active: boolean;
}

export interface CustomerTypeCatalogPort {
  findCustomerTypeById(id: number): Promise<CustomerTypeCatalogItem | null>;
}

export const CUSTOMER_TYPE_CATALOG_PORT_TOKEN = Symbol('CustomerTypeCatalogPort');
