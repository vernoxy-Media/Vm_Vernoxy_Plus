import { SalesDashboardUseCases } from './sales-dashboard.use-cases';

const admin = { emp_id: 1, is_admin: true, is_sales: false };
const sales = { emp_id: 7, is_admin: false, is_sales: true };

function repo() {
  return {
    getUserPermissions: jest.fn().mockResolvedValue({ chart_a: true }),
    getDashboardData: jest.fn().mockResolvedValue({ ok: true }),
    getDefaultConfig: jest.fn().mockResolvedValue({ default_filters: { date_range: 'this_month' }, updated_at: null, updated_by_name: null }),
    saveDefaultConfig: jest.fn().mockResolvedValue(undefined),
    listAllUserPermissions: jest.fn().mockResolvedValue([]),
    saveUserPermissions: jest.fn().mockResolvedValue(undefined),
  };
}

describe('SalesDashboardUseCases', () => {
  it("loads the data with the viewer's own chart permissions", async () => {
    const r = repo();
    const filters = { city: ['Surat'], date_range: 'this_month' } as never;
    await new SalesDashboardUseCases(r as never).getDashboardData(filters, sales, { us03_group_by: 'week' });
    expect(r.getUserPermissions).toHaveBeenCalledWith(7, false);
    expect(r.getDashboardData).toHaveBeenCalledWith(filters, 7, false, { chart_a: true }, { us03_group_by: 'week' });
  });

  it('returns the default filters together with the chart permissions', async () => {
    const config = await new SalesDashboardUseCases(repo() as never).getConfig(sales);
    expect(config.default_filters).toEqual({ date_range: 'this_month' });
    expect(config.chart_permissions).toEqual({ chart_a: true });
  });

  it('lets only the Admin save defaults and then shows the saved config', async () => {
    const r = repo();
    const uc = new SalesDashboardUseCases(r as never);
    await expect(uc.saveDefaults({ date_range: 'today' }, sales)).rejects.toThrow('Only administrators');
    expect(r.saveDefaultConfig).not.toHaveBeenCalled();
    const after = await uc.saveDefaults({ date_range: 'today' }, admin);
    expect(r.saveDefaultConfig).toHaveBeenCalledWith({ date_range: 'today' }, 1);
    expect(after.chart_permissions).toEqual({ chart_a: true });
  });

  it('lets only the Admin see and change who sees which chart', async () => {
    const r = repo();
    const uc = new SalesDashboardUseCases(r as never);
    await expect(uc.listUserPermissions(sales)).rejects.toThrow();
    await expect(uc.updateUserPermissions(9, { chart_a: false }, sales)).rejects.toThrow();
    expect(r.saveUserPermissions).not.toHaveBeenCalled();
    await expect(uc.listUserPermissions(admin)).resolves.toEqual([]);
    await expect(uc.updateUserPermissions(9, { chart_a: false }, admin)).resolves.toEqual({ success: true });
    expect(r.saveUserPermissions).toHaveBeenCalledWith(9, { chart_a: false }, 1);
  });
});
