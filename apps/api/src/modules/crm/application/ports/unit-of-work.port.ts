export interface CrmUnitOfWorkPort {
  runInTransaction<T>(work: (tx: any) => Promise<T>): Promise<T>;
}

export const CRM_UNIT_OF_WORK_PORT_TOKEN = Symbol('CrmUnitOfWorkPort');
