import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(() => {
    service = new PrismaService();
  });

  it('should be defined and instantiate cleanly', () => {
    expect(service).toBeDefined();
    expect((service as any).schema_migrations).toBeUndefined();
  });
});
