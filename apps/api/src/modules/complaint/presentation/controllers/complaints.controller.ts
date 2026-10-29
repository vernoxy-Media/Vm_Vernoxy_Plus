import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  ParseIntPipe,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { OrganizationAdminGuard } from '../../../organization/presentation/guards/organization-admin.guard';
import {
  ACCESS_POLICY_PORT_TOKEN,
  AccessPolicyPort,
} from '../../../organization/application/ports/access-policy.port';
import { ComplaintsService } from '../../application/services/complaints.service';
import {
  CreateComplaintDto,
  AcceptAndAssignDto,
  CloseWithoutActionDto,
  ReassignHandlerDto,
  ChangePriorityDto,
  ChangeTargetDateDto,
  ChangeConfidentialityDto,
  AddActionDto,
  AddRemarkDto,
  RecordResolutionDto,
  ConfirmResolutionDto,
  ReopenComplaintDto,
  SendBackDto,
  CloseComplaintDto,
  WithdrawComplaintDto,
  ComplaintReportsQueryDto,
} from '../dto/complaints.dto';

@ApiTags('Complaints')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('complaints')
export class ComplaintsController {
  constructor(
    private readonly complaintsService: ComplaintsService,
    @Inject(ACCESS_POLICY_PORT_TOKEN)
    private readonly accessPolicy: AccessPolicyPort,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Employee Self-Service
  // ---------------------------------------------------------------------------

  @Get('my')
  @ApiOperation({ summary: 'Get current employee complaints and summary counters' })
  async getMyComplaints(
    @Req() req: any,
    @Query('year') year?: string,
    @Query('status') status?: string,
    @Query('typeId') typeId?: string,
  ) {
    const empId = req.user?.emp_id || 1;
    return this.complaintsService.getMyComplaints(
      empId,
      year ? parseInt(year, 10) : undefined,
      status,
      typeId ? parseInt(typeId, 10) : undefined,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Submit a new complaint' })
  async createComplaint(@Req() req: any, @Body() dto: CreateComplaintDto) {
    const empId = req.user?.emp_id || 1;
    return this.complaintsService.createComplaint(empId, dto);
  }

  // ---------------------------------------------------------------------------
  // 2. Admin & Handler Complaint Management
  // ---------------------------------------------------------------------------

  @Get()
  @ApiOperation({ summary: 'Get all complaints (Admin sees all; Handlers see assigned)' })
  async getAllComplaints(
    @Req() req: any,
    @Query('tab') tab?: 'Active' | 'New' | 'Resolved' | 'Closed' | 'All',
    @Query('type_id') type_id?: string,
    @Query('department_id') department_id?: string,
    @Query('priority') priority?: string,
    @Query('handler_id') handler_id?: string,
    @Query('from_date') from_date?: string,
    @Query('to_date') to_date?: string,
    @Query('search') search?: string,
  ) {
    const empId = req.user?.emp_id || 1;
    const isAdmin = await this.accessPolicy.canManageOrganization(empId);
    return this.complaintsService.getAllComplaints(empId, isAdmin, {
      tab,
      type_id: type_id ? parseInt(type_id, 10) : undefined,
      department_id: department_id ? parseInt(department_id, 10) : undefined,
      priority,
      handler_id: handler_id ? parseInt(handler_id, 10) : undefined,
      from_date,
      to_date,
      search,
    });
  }

  @Get('reports')
  @ApiOperation({ summary: 'Get complaint reports and 6-month historical trends (Admin)' })
  async getReports(@Req() req: any, @Query() query: ComplaintReportsQueryDto) {
    const empId = req.user?.emp_id || 1;
    const isAdmin = await this.accessPolicy.canManageOrganization(empId);
    return this.complaintsService.getReports(empId, isAdmin, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get complaint details, actions, remarks, and history' })
  async getComplaintById(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const empId = req.user?.emp_id || 1;
    const isAdmin = await this.accessPolicy.canManageOrganization(empId);
    return this.complaintsService.getComplaintById(id, empId, isAdmin);
  }

  // ---------------------------------------------------------------------------
  // 3. Workflow Transitions
  // ---------------------------------------------------------------------------

  @UseGuards(OrganizationAdminGuard)
  @Post(':id/accept-and-assign')
  @ApiOperation({ summary: 'Accept and assign a new complaint (Admin)' })
  async acceptAndAssign(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AcceptAndAssignDto,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.complaintsService.acceptAndAssign(id, adminId, dto);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post(':id/close-without-action')
  @ApiOperation({ summary: 'Close a new complaint without action (Admin)' })
  async closeWithoutAction(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CloseWithoutActionDto,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.complaintsService.closeWithoutAction(id, adminId, dto);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post(':id/reassign')
  @ApiOperation({ summary: 'Reassign handler (Admin)' })
  async reassignHandler(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReassignHandlerDto,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.complaintsService.reassignHandler(id, adminId, dto);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post(':id/change-priority')
  @ApiOperation({ summary: 'Change priority (Admin)' })
  async changePriority(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangePriorityDto,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.complaintsService.changePriority(id, adminId, dto);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post(':id/change-target-date')
  @ApiOperation({ summary: 'Change target resolution date (Admin)' })
  async changeTargetDate(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeTargetDateDto,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.complaintsService.changeTargetDate(id, adminId, dto);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post(':id/change-confidentiality')
  @ApiOperation({ summary: 'Change confidentiality status (Admin)' })
  async changeConfidentiality(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeConfidentialityDto,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.complaintsService.changeConfidentiality(id, adminId, dto);
  }

  @Post(':id/start-work')
  @ApiOperation({ summary: 'Start work on Open complaint (Handler or Admin)' })
  async startWork(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const empId = req.user?.emp_id || 1;
    const isAdmin = await this.accessPolicy.canManageOrganization(empId);
    return this.complaintsService.startWork(id, empId, isAdmin);
  }

  @Post(':id/actions')
  @ApiOperation({ summary: 'Record action taken during investigation (Handler or Admin)' })
  async addAction(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddActionDto,
  ) {
    const empId = req.user?.emp_id || 1;
    const isAdmin = await this.accessPolicy.canManageOrganization(empId);
    return this.complaintsService.addAction(id, empId, isAdmin, dto);
  }

  @Post(':id/remarks')
  @ApiOperation({ summary: 'Add note/remark (Complainant, Handler, or Admin)' })
  async addRemark(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddRemarkDto,
  ) {
    const empId = req.user?.emp_id || 1;
    const isAdmin = await this.accessPolicy.canManageOrganization(empId);
    return this.complaintsService.addRemark(id, empId, isAdmin, dto);
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Record complaint resolution (Handler or Admin)' })
  async recordResolution(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RecordResolutionDto,
  ) {
    const empId = req.user?.emp_id || 1;
    const isAdmin = await this.accessPolicy.canManageOrganization(empId);
    return this.complaintsService.recordResolution(id, empId, isAdmin, dto);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Employee confirms resolution within 7 days' })
  async confirmResolution(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmResolutionDto,
  ) {
    const empId = req.user?.emp_id || 1;
    return this.complaintsService.confirmResolution(id, empId, dto);
  }

  @Post(':id/reopen')
  @ApiOperation({ summary: 'Employee reopens resolution within 7 days' })
  async reopenComplaint(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReopenComplaintDto,
  ) {
    const empId = req.user?.emp_id || 1;
    return this.complaintsService.reopenComplaint(id, empId, dto);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post(':id/send-back')
  @ApiOperation({ summary: 'Admin sends resolved complaint back to handler' })
  async sendBackToHandler(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendBackDto,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.complaintsService.sendBackToHandler(id, adminId, dto);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post(':id/close')
  @ApiOperation({ summary: 'Admin closes resolved complaint' })
  async closeComplaint(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CloseComplaintDto,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.complaintsService.closeComplaint(id, adminId, dto);
  }

  @Post(':id/withdraw')
  @ApiOperation({ summary: 'Employee withdraws complaint while in New or Open status' })
  async withdrawComplaint(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: WithdrawComplaintDto,
  ) {
    const empId = req.user?.emp_id || 1;
    return this.complaintsService.withdrawComplaint(id, empId, dto);
  }
}

