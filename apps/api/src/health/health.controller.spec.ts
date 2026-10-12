import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../core/prisma/prisma.service';
import { ServiceUnavailableException } from '@nestjs/common';

describe('HealthController (Unit)', () => {
  let controller: HealthController;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            checkHealth: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should return ok when db is healthy', async () => {
    const res = await controller.getHealth();
    expect(res.status).toBe('ok');
    expect(res.database).toBe('connected');
    expect(res.timestamp).toBeDefined();
  });

  it('should throw ServiceUnavailableException when db is unhealthy', async () => {
    jest.spyOn(prisma, 'checkHealth').mockResolvedValueOnce(false);
    await expect(controller.getHealth()).rejects.toThrow(ServiceUnavailableException);
  });
});
