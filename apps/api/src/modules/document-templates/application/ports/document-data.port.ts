/**
 * Where the real data of a document comes from. The module that owns the data (Payroll for the
 * Salary Slip) implements this and registers it, so this module never depends on that module.
 *
 * `subject` says which document: for a Salary Slip { year, month, emp_id }.
 */
export interface DocumentDataSource<TData = unknown> {
  kind: string;
  load(subject: Record<string, unknown>): Promise<TData>;
}
