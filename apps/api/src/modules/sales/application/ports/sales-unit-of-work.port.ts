/** Runs several repository calls in one database transaction; the opaque `tx` is passed to each call. */
export interface SalesUnitOfWorkPort {
  run<T>(fn: (tx: unknown) => Promise<T>): Promise<T>;
}

export const SALES_UNIT_OF_WORK_PORT_TOKEN = Symbol('SalesUnitOfWorkPort');
