import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../core/prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness & readiness probe (including database connection)' })
  @ApiResponse({
    status: 200,
    description: 'Service and database are healthy',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-10-09T10:00:00.000Z',
        database: 'connected',
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Database or service unhealthy',
  })
  async getHealth() {
    const isDbHealthy = await this.prisma.checkHealth();
    if (!isDbHealthy) {
      throw new ServiceUnavailableException({
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
      });
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    };
  }
}
