import { Controller, ForbiddenException, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/public-api';
import {
  DashboardViewerNotFoundError,
  GetHomeDashboardUseCase,
  HomeDashboardResult,
} from '../application/use-cases/get-home-dashboard.use-case';

@ApiTags('Main User Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('home-dashboard')
export class HomeDashboardController {
  constructor(private readonly getDashboard: GetHomeDashboardUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'The signed-in employee\'s department-wise dashboard (BFD VM-004)',
    description:
      'Read-only. Every section is scoped on the server: personal sections show only the employee\'s own records, ' +
      'assignment sections appear only for a real Project Manager / Authorised Approver / Complaint Handler assignment, ' +
      'the Admin section only for an admin role and the Sales section only with Sales module access.',
  })
  @ApiResponse({ status: 200, description: 'Dashboard data for the signed-in employee' })
  async get(@Req() req: Request): Promise<HomeDashboardResult> {
    try {
      return await this.getDashboard.execute(req.user!.emp_id);
    } catch (err) {
      if (err instanceof DashboardViewerNotFoundError) {
        throw new ForbiddenException({ type: 'about:blank', title: 'Forbidden', status: 403, code: 'FORBIDDEN', detail: err.message });
      }
      throw err;
    }
  }
}
