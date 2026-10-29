import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { OrganizationAdminGuard } from '../../../organization/presentation/guards/organization-admin.guard';
import { ExpenseSettingsService } from '../../application/services/expense-settings.service';
import {
  CreateExpenseCategoryDto,
  UpdateExpenseCategoryDto,
  UpdateExpenseGeneralSettingsDto,
  AssignAuthorisedApproverDto,
  CreateExpenseTypeDto,
  UpdateExpenseTypeDto,
} from '../dto/expense-settings.dto';

@ApiTags('Expense Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expense/settings')
export class ExpenseSettingsController {
  constructor(private readonly expenseSettingsService: ExpenseSettingsService) {}

  // ---------------------------------------------------------------------------
  // Categories (Master Data)
  // ---------------------------------------------------------------------------

  @Get('categories')
  @ApiOperation({ summary: 'Get all active expense categories' })
  async getCategories() {
    return this.expenseSettingsService.getCategories();
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Get expense category by ID' })
  async getCategoryById(@Param('id', ParseIntPipe) id: number) {
    return this.expenseSettingsService.getCategoryById(id);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post('categories')
  @ApiOperation({ summary: 'Create new expense category (Admin only)' })
  async createCategory(@Body() dto: CreateExpenseCategoryDto, @Req() req: any) {
    const adminId = req.user?.emp_id || 1;
    return this.expenseSettingsService.createCategory(dto, adminId);
  }

  @UseGuards(OrganizationAdminGuard)
  @Put('categories/:id')
  @ApiOperation({ summary: 'Update expense category (Admin only)' })
  async updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExpenseCategoryDto,
    @Req() req: any,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.expenseSettingsService.updateCategory(id, dto, adminId);
  }

  @UseGuards(OrganizationAdminGuard)
  @Patch('categories/:id/toggle-status')
  @ApiOperation({ summary: 'Toggle category active/inactive status (Admin only)' })
  async toggleCategoryStatus(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const adminId = req.user?.emp_id || 1;
    return this.expenseSettingsService.toggleCategoryStatus(id, adminId);
  }

  @UseGuards(OrganizationAdminGuard)
  @Delete('categories/:id')
  @ApiOperation({ summary: 'Soft delete expense category (Admin only)' })
  async deleteCategory(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const adminId = req.user?.emp_id || 1;
    return this.expenseSettingsService.deleteCategory(id, adminId);
  }

  // ---------------------------------------------------------------------------
  // General Settings
  // ---------------------------------------------------------------------------

  @Get('general')
  @ApiOperation({ summary: 'Get expense module general configuration' })
  async getGeneralSettings() {
    return this.expenseSettingsService.getGeneralSettings();
  }

  @UseGuards(OrganizationAdminGuard)
  @Put('general')
  @ApiOperation({ summary: 'Update expense general configuration (Admin only)' })
  async updateGeneralSettings(@Body() dto: UpdateExpenseGeneralSettingsDto, @Req() req: any) {
    const adminId = req.user?.emp_id || 1;
    return this.expenseSettingsService.updateGeneralSettings(dto, adminId);
  }

  // ---------------------------------------------------------------------------
  // Authorised Approvers
  // ---------------------------------------------------------------------------

  @Get('approvers')
  @ApiOperation({ summary: 'Get department authorised approvers mapping' })
  async getAuthorisedApprovers() {
    return this.expenseSettingsService.getAuthorisedApprovers();
  }

  @UseGuards(OrganizationAdminGuard)
  @Post('approvers')
  @ApiOperation({ summary: 'Assign or update department authorised approver (Admin only)' })
  async assignAuthorisedApprover(@Body() dto: AssignAuthorisedApproverDto, @Req() req: any) {
    const adminId = req.user?.emp_id || 1;
    return this.expenseSettingsService.assignAuthorisedApprover(dto, adminId);
  }

  @UseGuards(OrganizationAdminGuard)
  @Delete('approvers/:departmentId')
  @ApiOperation({ summary: 'Remove department authorised approver (Admin only)' })
  async removeAuthorisedApprover(
    @Param('departmentId', ParseIntPipe) departmentId: number,
    @Req() req: any,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.expenseSettingsService.removeAuthorisedApprover(departmentId, adminId);
  }

  // ---------------------------------------------------------------------------
  // Expense Types (Master Data)
  // ---------------------------------------------------------------------------

  @Get('types')
  @ApiOperation({ summary: 'Get all active expense types' })
  async getExpenseTypes() {
    return this.expenseSettingsService.getExpenseTypes();
  }

  @UseGuards(OrganizationAdminGuard)
  @Post('types')
  @ApiOperation({ summary: 'Create new expense type (Admin only)' })
  async createExpenseType(@Body() dto: CreateExpenseTypeDto, @Req() req: any) {
    const adminId = req.user?.emp_id || 1;
    return this.expenseSettingsService.createExpenseType(dto, adminId);
  }

  @UseGuards(OrganizationAdminGuard)
  @Put('types/:id')
  @ApiOperation({ summary: 'Update expense type (Admin only)' })
  async updateExpenseType(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExpenseTypeDto,
    @Req() req: any,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.expenseSettingsService.updateExpenseType(id, dto, adminId);
  }

  @UseGuards(OrganizationAdminGuard)
  @Patch('types/:id/toggle-status')
  @ApiOperation({ summary: 'Toggle expense type active/inactive status (Admin only)' })
  async toggleExpenseTypeStatus(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const adminId = req.user?.emp_id || 1;
    return this.expenseSettingsService.toggleExpenseTypeStatus(id, adminId);
  }

  @UseGuards(OrganizationAdminGuard)
  @Delete('types/:id')
  @ApiOperation({ summary: 'Soft delete expense type (Admin only)' })
  async deleteExpenseType(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const adminId = req.user?.emp_id || 1;
    return this.expenseSettingsService.deleteExpenseType(id, adminId);
  }

  // ---------------------------------------------------------------------------
  // Audit Trail / Change Log
  // ---------------------------------------------------------------------------

  @Get('change-log')
  @ApiOperation({ summary: 'Get expense settings change audit trail' })
  async getChangeLogs() {
    return this.expenseSettingsService.getChangeLogs();
  }
}

