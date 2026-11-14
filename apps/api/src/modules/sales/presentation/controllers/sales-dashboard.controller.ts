import { Body, Controller, Get, Param, ParseIntPipe, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/public-api';
import { SalesAccessGuard } from '../guards/sales-access.guard';
import { CurrentSalesActor } from '../guards/sales-actor.decorator';
import { mapSalesErrorToHttpException } from '../sales-error.mapper';
import { SalesActor } from '../../application/ports/sales-access-policy.port';
import { SalesDashboardUseCases } from '../../application/use-cases/sales-dashboard.use-cases';
import {
  SalesDashboardQueryDto,
  UpdateDashboardDefaultsDto,
  UpdateUserChartPermissionsDto,
} from '../dto/sales-dashboard.dto';

const toArray = (v: unknown): string[] | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  if (Array.isArray(v)) return v.map(String);
  return String(v).split(',').map((s) => s.trim()).filter(Boolean);
};

const toIntArray = (v: unknown): number[] | undefined => {
  const arr = toArray(v);
  if (!arr) return undefined;
  return arr.map(Number).filter((n) => !Number.isNaN(n));
};

@ApiTags('Sales - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SalesAccessGuard)
@Controller('sales/dashboard')
export class SalesDashboardController {
  constructor(private readonly dashboard: SalesDashboardUseCases) {}

  @Get('data')
  @ApiOperation({ summary: 'Get Sales Management Dashboard data for all accessible charts and counters' })
  async getData(@Query() q: SalesDashboardQueryDto, @CurrentSalesActor() actor: SalesActor) {
    try {
      const filters = {
        q: q.q,
        lead_source: toArray(q.lead_source),
        lead_by: q.lead_by,
        service_fit: toArray(q.service_fit),
        status: toArray(q.status),
        city: toArray(q.city),
        industry_ids: toIntArray(q.industry_ids),
        date_range: q.date_range,
        from: q.from,
        to: q.to,
      };

      const extra = {
        us03_group_by: q.us03_group_by,
        us08_compare_by: q.us08_compare_by,
        us09_group_by: q.us09_group_by,
        us12_date: q.us12_date,
        us12_follow_up_from: q.us12_follow_up_from,
        us12_follow_up_to: q.us12_follow_up_to,
      };

      return await this.dashboard.getDashboardData(filters, actor, extra);
    } catch (err) {
      throw mapSalesErrorToHttpException(err);
    }
  }

  @Get('config')
  @ApiOperation({ summary: 'Get default filters and allowed charts for the current user' })
  async getConfig(@CurrentSalesActor() actor: SalesActor) {
    try {
      return await this.dashboard.getConfig(actor);
    } catch (err) {
      throw mapSalesErrorToHttpException(err);
    }
  }

  @Put('config/defaults')
  @ApiOperation({ summary: 'Admin only: update default filters for the Sales Management Dashboard' })
  async updateDefaults(@Body() body: UpdateDashboardDefaultsDto, @CurrentSalesActor() actor: SalesActor) {
    try {
      return await this.dashboard.saveDefaults(body, actor);
    } catch (err) {
      throw mapSalesErrorToHttpException(err);
    }
  }

  @Get('config/permissions')
  @ApiOperation({ summary: 'Admin only: list all users and their dashboard chart access' })
  async listPermissions(@CurrentSalesActor() actor: SalesActor) {
    try {
      return await this.dashboard.listUserPermissions(actor);
    } catch (err) {
      throw mapSalesErrorToHttpException(err);
    }
  }

  @Put('config/permissions/:empId')
  @ApiOperation({ summary: 'Admin only: update chart permissions for a specific user' })
  async updatePermissions(
    @Param('empId', ParseIntPipe) empId: number,
    @Body() body: UpdateUserChartPermissionsDto,
    @CurrentSalesActor() actor: SalesActor
  ) {
    try {
      return await this.dashboard.updateUserPermissions(empId, body.permissions, actor);
    } catch (err) {
      throw mapSalesErrorToHttpException(err);
    }
  }
}
