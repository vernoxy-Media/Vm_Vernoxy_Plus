import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsBoolean, Equals } from 'class-validator';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/public-api';
import { DataFlushService } from '../application/data-flush.service';

export class FlushDataDto {
  @ApiProperty({ example: 'FLUSH', description: 'Type FLUSH to confirm' })
  @Equals('FLUSH', { message: 'Type FLUSH to confirm.' })
  confirm!: string;

  @ApiProperty({ description: 'Also delete the master data (dropdown lists, policies, settings). Admin users always stay.' })
  @IsBoolean()
  include_master_data!: boolean;
}

@ApiTags('Maintenance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/maintenance')
export class MaintenanceController {
  constructor(private readonly flushService: DataFlushService) {}

  @Get('flush-status')
  @ApiOperation({ summary: 'Is the data flush available on this server? (Admin only)' })
  async status(@Req() req: Request) {
    await this.assertAdmin(req.user!.emp_id);
    return { enabled: this.flushService.isEnabled() };
  }

  @Post('flush')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete all data and keep only the Admin user(s). Test (QA) server only: needs ALLOW_DATA_FLUSH=true.' })
  async flush(@Req() req: Request, @Body() body: FlushDataDto) {
    return this.flushService.flush(req.user!.emp_id, body.include_master_data);
  }

  private async assertAdmin(empId: number) {
    if (!(await this.flushService.isAdmin(empId))) throw new ForbiddenException('Only an Admin can use this.');
  }
}
