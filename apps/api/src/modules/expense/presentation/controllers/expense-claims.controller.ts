import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
import { ExpenseClaimsService } from '../../application/services/expense-claims.service';
import {
  CreateExpenseClaimDto,
  UpdateExpenseClaimDto,
  ReviewExpenseClaimDto,
  ReopenExpenseClaimDto,
  DirectReimbursementDto,
  PayrollReimbursementDto,
  ExpenseReportsQueryDto,
} from '../dto/expense-claims.dto';

@ApiTags('Expense Claims')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expense')
export class ExpenseClaimsController {
  constructor(
    private readonly claimsService: ExpenseClaimsService,
    @Inject(ACCESS_POLICY_PORT_TOKEN)
    private readonly accessPolicy: AccessPolicyPort,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Employee Self-Service Claims
  // ---------------------------------------------------------------------------

  @Get('claims/my')
  @ApiOperation({ summary: 'Get current employee expense claims and summary stats' })
  async getMyClaims(@Req() req: any, @Query('status') status?: string) {
    const empId = req.user?.emp_id || 1;
    return this.claimsService.getMyClaims(empId, status);
  }

  @Post('claims')
  @ApiOperation({ summary: 'Create a new expense claim (Draft or Submitted)' })
  async createClaim(@Req() req: any, @Body() dto: CreateExpenseClaimDto) {
    const empId = req.user?.emp_id || 1;
    return this.claimsService.createClaim(empId, dto);
  }

  @Get('claims/:id')
  @ApiOperation({ summary: 'Get detailed claim view with timeline and attachments' })
  async getClaimById(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const empId = req.user?.emp_id || 1;
    const isAdmin = await this.accessPolicy.canManageOrganization(empId);
    return this.claimsService.getClaimById(id, empId, isAdmin);
  }

  @Put('claims/:id')
  @ApiOperation({ summary: 'Update an existing draft expense claim' })
  async updateClaim(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExpenseClaimDto,
  ) {
    const empId = req.user?.emp_id || 1;
    return this.claimsService.updateClaim(id, empId, dto);
  }

  @Post('claims/:id/submit')
  @ApiOperation({ summary: 'Submit a draft claim for approval' })
  async submitDraft(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const empId = req.user?.emp_id || 1;
    return this.claimsService.submitDraft(id, empId);
  }

  @Post('claims/:id/withdraw')
  @ApiOperation({ summary: 'Withdraw a submitted claim back to draft' })
  async withdrawClaim(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const empId = req.user?.emp_id || 1;
    return this.claimsService.withdrawClaim(id, empId);
  }

  @Delete('claims/:id')
  @ApiOperation({ summary: 'Soft delete a draft claim' })
  async deleteClaim(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const empId = req.user?.emp_id || 1;
    return this.claimsService.deleteClaim(id, empId);
  }

  @Post('claims/:id/copy-to-draft')
  @ApiOperation({ summary: 'Clone a rejected claim into a fresh draft' })
  async copyToDraft(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const empId = req.user?.emp_id || 1;
    return this.claimsService.copyToDraft(id, empId);
  }

  // ---------------------------------------------------------------------------
  // 2. Approvals Queue (Designated Approver or Admin)
  // ---------------------------------------------------------------------------

  @Get('approvals/queue')
  @ApiOperation({ summary: 'Get pending claims awaiting review' })
  async getApprovalsQueue(@Req() req: any) {
    const empId = req.user?.emp_id || 1;
    const isAdmin = await this.accessPolicy.canManageOrganization(empId);
    return this.claimsService.getApprovalsQueue(empId, isAdmin);
  }

  @Post('approvals/:id/review')
  @ApiOperation({ summary: 'Approve or reject a submitted claim' })
  async reviewClaim(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewExpenseClaimDto,
  ) {
    const empId = req.user?.emp_id || 1;
    const isAdmin = await this.accessPolicy.canManageOrganization(empId);
    return this.claimsService.reviewClaim(id, empId, isAdmin, dto);
  }

  // ---------------------------------------------------------------------------
  // 3. Admin: Reopen Decided Claim
  // ---------------------------------------------------------------------------

  @UseGuards(OrganizationAdminGuard)
  @Post('claims/:id/reopen')
  @ApiOperation({ summary: 'Admin reopens a decided (Approved/Rejected) claim' })
  async reopenClaim(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReopenExpenseClaimDto,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.claimsService.reopenClaim(id, adminId, dto);
  }

  // ---------------------------------------------------------------------------
  // 4. Admin / Finance: Reimbursements
  // ---------------------------------------------------------------------------

  @UseGuards(OrganizationAdminGuard)
  @Get('reimbursements/queue')
  @ApiOperation({ summary: 'Get approved claims awaiting or completed reimbursement' })
  async getReimbursementQueue(@Query('status') status?: string) {
    return this.claimsService.getReimbursementQueue(status);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post('reimbursements/:id/direct')
  @ApiOperation({ summary: 'Record direct payout (Bank Transfer, UPI, Cash, Cheque)' })
  async processDirectReimbursement(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DirectReimbursementDto,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.claimsService.processDirectReimbursement(id, adminId, dto);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post('reimbursements/:id/add-to-payroll')
  @ApiOperation({ summary: 'Queue claim reimbursement in payroll' })
  async addToPayroll(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PayrollReimbursementDto,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.claimsService.addToPayroll(id, adminId, dto);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post('reimbursements/:id/remove-from-payroll')
  @ApiOperation({ summary: 'Remove queued claim from payroll and revert to direct queue' })
  async removeFromPayroll(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.claimsService.removeFromPayroll(id, adminId);
  }

  // ---------------------------------------------------------------------------
  // 5. Expense Reports (Section 11)
  // ---------------------------------------------------------------------------

  @Get('reports')
  @ApiOperation({ summary: 'Get Expense Reports with metrics, 6-month trend, breakdown and claims' })
  async getReports(@Req() req: any, @Query() query: ExpenseReportsQueryDto) {
    const empId = req.user?.emp_id || 1;
    const isAdmin = await this.accessPolicy.canManageOrganization(empId);
    return this.claimsService.getReports(empId, isAdmin, query);
  }
}

