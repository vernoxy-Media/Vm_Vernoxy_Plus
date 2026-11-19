import { Industry } from '../../domain/entities/industry.entity';
import { UpdateIndustryUseCase } from './update-industry.use-case';
import { IndustryRepositoryPort } from '../ports/industry.repository.port';

const industry = (id: number, name: string, parent_id: number | null = null, extra: Partial<{ is_active: boolean; is_default: boolean }> = {}) =>
  new Industry({ industry_id: id, name, parent_id, is_active: true, is_default: false, created_at: new Date(), ...extra });

function setup(rows: Industry[], opts: { children?: Record<number, number>; companies?: Record<number, number> } = {}) {
  const update = jest.fn(async (id: number, data: { parent_id?: number | null }) => {
    const row = rows.find((r) => r.industry_id === id)!;
    return new Industry({ ...row.props, parent_id: data.parent_id !== undefined ? data.parent_id : row.parent_id });
  });
  const repo = {
    findById: async (id: number) => rows.find((r) => r.industry_id === id) ?? null,
    findByName: async (name: string, parentId?: number | null) =>
      rows.find((r) => r.name.toLowerCase() === name.toLowerCase() && (r.parent_id ?? null) === (parentId ?? null)) ?? null,
    countChildren: async (id: number) => opts.children?.[id] ?? 0,
    countCompanies: async (id: number) => opts.companies?.[id] ?? 0,
    update,
  } as unknown as IndustryRepositoryPort;
  return { useCase: new UpdateIndustryUseCase(repo), update };
}

const rows = () => [industry(1, 'Manufacturing'), industry(2, 'Textile', 1), industry(3, 'IT'), industry(4, 'Software', 3), industry(5, 'Retail')];

describe('UpdateIndustryUseCase: parent industry', () => {
  it('keeps the level when the parent is not sent (a plain rename)', async () => {
    const { useCase, update } = setup(rows());
    await useCase.execute({ id: 2, name: 'Textiles', updated_by: 1 });
    expect(update).toHaveBeenCalledWith(2, expect.not.objectContaining({ parent_id: expect.anything() }));
  });

  it('moves a sub-industry under another top-level industry', async () => {
    const { useCase, update } = setup(rows());
    await useCase.execute({ id: 2, parent_id: 3, updated_by: 1 });
    expect(update).toHaveBeenCalledWith(2, expect.objectContaining({ parent_id: 3 }));
  });

  it('turns a sub-industry into a top-level industry with a null parent', async () => {
    const { useCase, update } = setup(rows());
    await useCase.execute({ id: 2, parent_id: null, updated_by: 1 });
    expect(update).toHaveBeenCalledWith(2, expect.objectContaining({ parent_id: null }));
  });

  it('turns a top-level industry into a sub-industry when it has no sub-industries and no companies', async () => {
    const { useCase, update } = setup(rows());
    await useCase.execute({ id: 5, parent_id: 1, updated_by: 1 });
    expect(update).toHaveBeenCalledWith(5, expect.objectContaining({ parent_id: 1 }));
  });

  it('refuses a parent that is itself a sub-industry (2 levels only)', async () => {
    const { useCase } = setup(rows());
    await expect(useCase.execute({ id: 5, parent_id: 2, updated_by: 1 })).rejects.toThrow(/2 levels/);
  });

  it('refuses to make an industry its own parent', async () => {
    const { useCase } = setup(rows());
    await expect(useCase.execute({ id: 1, parent_id: 1, updated_by: 1 })).rejects.toThrow(/own parent/);
  });

  it('refuses to turn an industry that has sub-industries into a sub-industry', async () => {
    const { useCase } = setup(rows(), { children: { 1: 1 } });
    await expect(useCase.execute({ id: 1, parent_id: 3, updated_by: 1 })).rejects.toThrow(/sub-industries/);
  });

  it('refuses to change the level of an industry that companies use', async () => {
    const { useCase } = setup(rows(), { companies: { 5: 2 } });
    await expect(useCase.execute({ id: 5, parent_id: 1, updated_by: 1 })).rejects.toThrow(/Companies are using/);
  });

  it('refuses a parent that is inactive', async () => {
    const list = [...rows().slice(0, 4), industry(6, 'Dormant', null, { is_active: false }), industry(5, 'Retail')];
    const { useCase } = setup(list);
    await expect(useCase.execute({ id: 5, parent_id: 6, updated_by: 1 })).rejects.toThrow(/inactive/);
  });

  it('keeps the default industry top-level', async () => {
    const list = [industry(1, 'Other', null, { is_default: true }), industry(3, 'IT')];
    const { useCase } = setup(list);
    await expect(useCase.execute({ id: 1, parent_id: 3, updated_by: 1 })).rejects.toThrow(/default/i);
  });

  it('refuses a name that is already taken at the level it moves to', async () => {
    const list = [...rows(), industry(6, 'Textile', 3)];
    const { useCase } = setup(list);
    await expect(useCase.execute({ id: 2, parent_id: 3, updated_by: 1 })).rejects.toThrow(/already exists/);
  });
});
