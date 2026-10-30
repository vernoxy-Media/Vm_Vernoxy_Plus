import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { LicenseService } from '../../application/services/license.service';
import {
  CreateSoftwareLicenseDto,
  UpdateSoftwareLicenseDto,
  RenewLicenseDto,
  AssignLicenseDto,
  RevokeLicenseDto,
  DiscontinueLicenseDto,
  QuerySoftwareLicenseDto,
} from '../dto/license.dto';

@ApiTags('Software Licenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('licenses')
export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  // ---------------------------------------------------------------------------
  // 1. Employee Self-Service
  // ---------------------------------------------------------------------------
  @Get('my')
  @ApiOperation({ summary: 'Get current employee assigned software' })
  async getMySoftware(@Req() req: any) {
    const empId = req.user?.emp_id || 1;
    return this.licenseService.getMySoftware(empId);
  }

  // ---------------------------------------------------------------------------
  // 2. Urgent Recovery Banner
  // ---------------------------------------------------------------------------
  @Get('to-recover')
  @ApiOperation({ summary: 'Get licenses assigned to departed or non-active employees' })
  async getLicensesToRecover() {
    return this.licenseService.getLicensesToRecover();
  }

  // ---------------------------------------------------------------------------
  // 3. Status and Recovery Nightly Sync
  // ---------------------------------------------------------------------------
  @Post('sync')
  @ApiOperation({ summary: 'Sync software statuses and flag departed employees' })
  async syncStatuses() {
    return this.licenseService.syncStatusesAndRecovery();
  }

  // ---------------------------------------------------------------------------
  // 4. Software Register / Listing
  // ---------------------------------------------------------------------------
  @Get()
  @ApiOperation({ summary: 'List all software with filters, pagination, and metrics' })
  async getSoftwareList(@Query() query: QuerySoftwareLicenseDto) {
    return this.licenseService.getSoftwareList(query);
  }

  // ---------------------------------------------------------------------------
  // 5. Create Software
  // ---------------------------------------------------------------------------
  @Post()
  @ApiOperation({ summary: 'Register a new software license with initial term' })
  async createSoftware(@Req() req: any, @Body() dto: CreateSoftwareLicenseDto) {
    const empId = req.user?.emp_id || 1;
    return this.licenseService.createSoftware(dto, empId);
  }

  // ---------------------------------------------------------------------------
  // 6. Single Software Details
  // ---------------------------------------------------------------------------
  @Get(':id')
  @ApiOperation({ summary: 'Get full details of a software license' })
  async getSoftwareById(@Param('id', ParseIntPipe) id: number) {
    return this.licenseService.getSoftwareById(id);
  }

  // ---------------------------------------------------------------------------
  // 7. Update Software Metadata
  // ---------------------------------------------------------------------------
  @Patch(':id')
  @ApiOperation({ summary: 'Update software metadata' })
  async updateSoftware(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSoftwareLicenseDto,
  ) {
    const empId = req.user?.emp_id || 1;
    return this.licenseService.updateSoftware(id, dto, empId);
  }

  // ---------------------------------------------------------------------------
  // 8. Assign License Seats
  // ---------------------------------------------------------------------------
  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign license seats to employees' })
  async assignLicense(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignLicenseDto,
  ) {
    const empId = req.user?.emp_id || 1;
    return this.licenseService.assignLicense(id, dto, empId);
  }

  // ---------------------------------------------------------------------------
  // 9. Renew License (New Term)
  // ---------------------------------------------------------------------------
  @Post(':id/renew')
  @ApiOperation({ summary: 'Renew software license with a new term' })
  async renewLicense(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RenewLicenseDto,
  ) {
    const empId = req.user?.emp_id || 1;
    return this.licenseService.renewLicense(id, dto, empId);
  }

  // ---------------------------------------------------------------------------
  // 10. Discontinue Software
  // ---------------------------------------------------------------------------
  @Post(':id/discontinue')
  @ApiOperation({ summary: 'Discontinue a software license' })
  async discontinueSoftware(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DiscontinueLicenseDto,
  ) {
    const empId = req.user?.emp_id || 1;
    return this.licenseService.discontinueSoftware(id, dto, empId);
  }

  // ---------------------------------------------------------------------------
  // 11. Revoke / Transfer Assignment
  // ---------------------------------------------------------------------------
  @Post('assignments/:assignmentId/revoke')
  @ApiOperation({ summary: 'Revoke or transfer a license assignment' })
  async revokeAssignment(
    @Req() req: any,
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Body() dto: RevokeLicenseDto,
  ) {
    const empId = req.user?.emp_id || 1;
    return this.licenseService.revokeAssignment(assignmentId, dto, empId);
  }
}

