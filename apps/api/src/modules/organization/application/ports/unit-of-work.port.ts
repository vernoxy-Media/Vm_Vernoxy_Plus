export interface UnitOfWorkPort {
  run<T>(fn: (tx: unknown) => Promise<T>): Promise<T>;
}

export const UNIT_OF_WORK_TOKEN = Symbol('UnitOfWorkPort');
