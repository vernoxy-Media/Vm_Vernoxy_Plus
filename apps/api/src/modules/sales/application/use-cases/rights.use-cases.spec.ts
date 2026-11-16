import { SalesRightsUseCases } from './rights.use-cases';
import { SalesRightsRepositoryPort, SalesUserRights } from '../ports/sales-rights.repository.port';
import { FieldValidationError, ForbiddenSalesError, NotFoundSalesError, RightRequiredError } from '../../domain/errors/sales.errors';

const admin = { emp_id: 1, is_admin: true, is_sales: false };
const sales = { emp_id: 7, is_admin: false, is_sales: true };

function repo(over: Partial<SalesRightsRepositoryPort> = {}): jest.Mocked<SalesRightsRepositoryPort> {
  return {
    get: jest.fn().mockResolvedValue({ can_import: false, can_export: false }),
    listUsers: jest.fn().mockResolvedValue([]),
    set: jest.fn(),
    ...over,
  } as jest.Mocked<SalesRightsRepositoryPort>;
}

describe('SalesRightsUseCases', () => {
  it('gives the Admin both rights without asking the database', async () => {
    const r = repo();
    expect(await new SalesRightsUseCases(r).me(admin)).toEqual({ can_import: true, can_export: true });
    expect(r.get).not.toHaveBeenCalled();
  });

  it("reads a Sales user's own rights", async () => {
    const r = repo({ get: jest.fn().mockResolvedValue({ can_import: true, can_export: false }) });
    expect(await new SalesRightsUseCases(r).me(sales)).toEqual({ can_import: true, can_export: false });
    expect(r.get).toHaveBeenCalledWith(7);
  });

  it('lets a user through only for a right they hold', async () => {
    const r = repo({ get: jest.fn().mockResolvedValue({ can_import: true, can_export: false }) });
    const uc = new SalesRightsUseCases(r);
    await expect(uc.require(sales, 'import')).resolves.toBeUndefined();
    await expect(uc.require(sales, 'export')).rejects.toBeInstanceOf(RightRequiredError);
    await expect(uc.require(admin, 'export')).resolves.toBeUndefined();
  });

  it('shows and changes rights for the Admin only', async () => {
    const r = repo();
    const uc = new SalesRightsUseCases(r);
    await expect(uc.list(sales)).rejects.toBeInstanceOf(ForbiddenSalesError);
    await expect(uc.set(sales, 9, { can_import: true })).rejects.toBeInstanceOf(ForbiddenSalesError);
    expect(r.set).not.toHaveBeenCalled();
    await expect(uc.list(admin)).resolves.toEqual([]);
  });

  it('refuses a request that changes nothing', async () => {
    const r = repo();
    await expect(new SalesRightsUseCases(r).set(admin, 9, {})).rejects.toBeInstanceOf(FieldValidationError);
    expect(r.set).not.toHaveBeenCalled();
  });

  it('saves the rights and returns the person', async () => {
    const saved: SalesUserRights = { emp_id: 9, name: 'Meera', is_admin: false, can_import: true, can_export: false };
    const r = repo({ set: jest.fn().mockResolvedValue(saved) });
    expect(await new SalesRightsUseCases(r).set(admin, 9, { can_import: true })).toBe(saved);
    expect(r.set).toHaveBeenCalledWith(9, { can_import: true }, 1);
  });

  it('says so when the person is not an active Sales user', async () => {
    const r = repo({ set: jest.fn().mockResolvedValue(null) });
    await expect(new SalesRightsUseCases(r).set(admin, 99, { can_export: true })).rejects.toBeInstanceOf(NotFoundSalesError);
  });
});
