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
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { LicenseService } from '../../application/services/license.service';
import { LicenseAccessService } from '../../application/services/license-access.service';
import { LicenseExportService, LicenseSheet } from '../../application/services/license-export.service';
import {
  CreateSoftwareLicenseDto,
  UpdateSoftwareLicenseDto,
  RenewLicenseDto,
  AssignLicenseDto,
  RevokeLicenseDto,
  DiscontinueLicenseDto,
  QuerySoftwareLicenseDto,
  BulkRevokeLicenseDto,
  AddSeatsDto,
  CorrectTermDto,
} from '../dto/license.dto';

/** Role checks follow BFD Section 13 "Who can see and change what". */
@ApiTags('Software Licenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('licenses')
export class LicenseController {
  constructor(
    private readonly licenseService: LicenseService,
    private readonly access: LicenseAccessService,
    private readonly exporter: LicenseExportService,
  ) {}

  private viewer(req: any) {
    return this.access.viewer(Number(req.user?.emp_id));
  }

  // ---------------------------------------------------------------------------
  // 0. What the current user may see and do (drives tabs and buttons on the web)
  // ---------------------------------------------------------------------------
  @Get('access')
  @ApiOperation({ summary: 'License rights of the current user' })
  async getAccess(@Req() req: any) {
    return this.access.flags(await this.viewer(req));
  }

  // ---------------------------------------------------------------------------
  // 1. Employee Self-Service (every employee; own seats only, no keys or costs)
  // ---------------------------------------------------------------------------
  @Get('my')
  @ApiOperation({ summary: 'Get current employee assigned software' })
  async getMySoftware(@Req() req: any) {
    const v = await this.viewer(req);
    return this.licenseService.getMySoftware(v.empId);
  }

  // ---------------------------------------------------------------------------
  // 1b. My Team: a Reporting Manager sees each team member's software, without costs or keys (BFD 9)
  // ---------------------------------------------------------------------------
  @Get('my-team')
  @ApiOperation({ summary: "Software of the current user's team members" })
  async getMyTeam(@Req() req: any) {
    const v = await this.viewer(req);
    return this.licenseService.getMyTeamSoftware(v.empId);
  }

  // ---------------------------------------------------------------------------
  // 1c. Export to Excel what the screen shows (register, History, reports). Keys are never exported.
  // ---------------------------------------------------------------------------
  @Post('export')
  @ApiOperation({ summary: 'Excel of the rows shown on screen' })
  async export(@Req() req: any, @Body() body: LicenseSheet, @Res({ passthrough: true }) res: Response) {
    const v = await this.viewer(req);
    if (!this.access.canViewAll(v) && !v.isOwner) this.access.assertViewAll(v);
    const buffer = await this.exporter.workbook(body);
    const name = String(body.sheet || 'licenses').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'licenses';
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${name}-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    });
    return new StreamableFile(buffer);
  }

  // ---------------------------------------------------------------------------
  // 2. Licenses to recover
  // ---------------------------------------------------------------------------
  @Get('to-recover')
  @ApiOperation({ summary: 'Get licenses assigned to departed or non-active employees' })
  async getLicensesToRecover(@Req() req: any) {
    const scope = this.access.assertRegister(await this.viewer(req));
    return this.licenseService.getLicensesToRecover(scope);
  }

  // ---------------------------------------------------------------------------
  // 3. Status and recovery sync
  // ---------------------------------------------------------------------------
  @Post('sync')
  @ApiOperation({ summary: 'Sync software statuses and flag departed employees' })
  async syncStatuses(@Req() req: any) {
    this.access.assertRegister(await this.viewer(req));
    return this.licenseService.syncStatusesAndRecovery();
  }

  // ---------------------------------------------------------------------------
  // 4. Software Register
  // ---------------------------------------------------------------------------
  @Get()
  @ApiOperation({ summary: 'List all software with filters, pagination, and metrics' })
  async getSoftwareList(@Req() req: any, @Query() query: QuerySoftwareLicenseDto) {
    const scope = this.access.assertRegister(await this.viewer(req));
    return this.licenseService.getSoftwareList(query, scope);
  }

  // ---------------------------------------------------------------------------
  // 5. Create Software (Admin, License Manager)
  // ---------------------------------------------------------------------------
  @Post()
  @ApiOperation({ summary: 'Register a new software license with initial term' })
  async createSoftware(@Req() req: any, @Body() dto: CreateSoftwareLicenseDto) {
    const v = await this.viewer(req);
    this.access.assertManage(v);
    return this.licenseService.createSoftware(dto, v.empId);
  }

  // ---------------------------------------------------------------------------
  // 6. Software Details (Admin, License Manager, Accounts, own Software Owner)
  // ---------------------------------------------------------------------------
  @Get(':id')
  @ApiOperation({ summary: 'Get full details of a software license' })
  async getSoftwareById(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const v = await this.viewer(req);
    await this.access.assertViewSoftware(v, id);
    const data = await this.licenseService.getSoftwareById(id);
    return { ...data, viewer: this.access.flags(v) };
  }

  // ---------------------------------------------------------------------------
  // 6b. License Key "Show" / "Copy" (Admin, License Manager; logged)
  // ---------------------------------------------------------------------------
  @Post(':id/license-key')
  @ApiOperation({ summary: 'Reveal the License Key (logged in the History)' })
  async revealLicenseKey(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { action?: 'VIEWED' | 'COPIED' },
  ) {
    const v = await this.viewer(req);
    this.access.assertManage(v);
    return this.licenseService.getLicenseKey(id, body?.action === 'COPIED' ? 'COPIED' : 'VIEWED', v.empId);
  }

  // ---------------------------------------------------------------------------
  // 7. Update Software (Admin, License Manager)
  // ---------------------------------------------------------------------------
  @Patch(':id')
  @ApiOperation({ summary: 'Update software metadata' })
  async updateSoftware(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSoftwareLicenseDto,
  ) {
    const v = await this.viewer(req);
    this.access.assertManage(v);
    return this.licenseService.updateSoftware(id, dto, v.empId, { isAdmin: v.isAdmin });
  }

  // ---------------------------------------------------------------------------
  // 7b. Add Seats in the middle of a term (Admin, License Manager)
  // ---------------------------------------------------------------------------
  @Post(':id/add-seats')
  @ApiOperation({ summary: 'Add seats to the current term (cost, date, invoice)' })
  async addSeats(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: AddSeatsDto) {
    const v = await this.viewer(req);
    this.access.assertManage(v);
    return this.licenseService.addSeats(id, dto, v.empId);
  }

  // ---------------------------------------------------------------------------
  // 7c. Correct the current term with a reason (Admin, License Manager)
  // ---------------------------------------------------------------------------
  @Patch(':id/current-term')
  @ApiOperation({ summary: 'Correct dates or cost of the current term, with a reason' })
  async correctTerm(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: CorrectTermDto) {
    const v = await this.viewer(req);
    this.access.assertManage(v);
    return this.licenseService.correctCurrentTerm(id, dto, v.empId);
  }

  // ---------------------------------------------------------------------------
  // 8. Assign (Admin, License Manager)
  // ---------------------------------------------------------------------------
  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign license seats to employees' })
  async assignLicense(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignLicenseDto,
  ) {
    const v = await this.viewer(req);
    this.access.assertManage(v);
    return this.licenseService.assignLicense(id, dto, v.empId);
  }

  // ---------------------------------------------------------------------------
  // 9. Renew (Admin, License Manager). Renewing a Discontinued software = Reopen, Admin only.
  // ---------------------------------------------------------------------------
  @Post(':id/renew')
  @ApiOperation({ summary: 'Renew software license with a new term' })
  async renewLicense(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RenewLicenseDto,
  ) {
    const v = await this.viewer(req);
    this.access.assertManage(v);
    if (await this.licenseService.isDiscontinued(id)) this.access.assertAdmin(v);
    return this.licenseService.renewLicense(id, dto, v.empId);
  }

  // ---------------------------------------------------------------------------
  // 10. Discontinue (Admin, License Manager)
  // ---------------------------------------------------------------------------
  @Post(':id/discontinue')
  @ApiOperation({ summary: 'Discontinue a software license' })
  async discontinueSoftware(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DiscontinueLicenseDto,
  ) {
    const v = await this.viewer(req);
    this.access.assertManage(v);
    return this.licenseService.discontinueSoftware(id, dto, v.empId);
  }

  // ---------------------------------------------------------------------------
  // 10b. Revoke several seats at once (Admin, License Manager)
  // ---------------------------------------------------------------------------
  @Post(':id/assignments/revoke')
  @ApiOperation({ summary: 'Revoke several seats with one date and one reason' })
  async revokeMany(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BulkRevokeLicenseDto,
  ) {
    const v = await this.viewer(req);
    this.access.assertManage(v);
    return this.licenseService.revokeMany(id, dto, v.empId);
  }

  // ---------------------------------------------------------------------------
  // 11. Revoke / Transfer (Admin, License Manager)
  // ---------------------------------------------------------------------------
  @Post('assignments/:assignmentId/revoke')
  @ApiOperation({ summary: 'Revoke or transfer a license assignment' })
  async revokeAssignment(
    @Req() req: any,
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Body() dto: RevokeLicenseDto,
  ) {
    const v = await this.viewer(req);
    this.access.assertManage(v);
    return this.licenseService.revokeAssignment(assignmentId, dto, v.empId);
  }
}
