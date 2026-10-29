import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { OrganizationAdminGuard } from '../../../organization/presentation/guards/organization-admin.guard';
import { ComplaintSettingsService } from '../../application/services/complaint-settings.service';
import {
  CreateComplaintTypeDto,
  UpdateComplaintTypeDto,
  UpdateComplaintSettingsDto,
} from '../dto/complaint-settings.dto';

@ApiTags('Complaint Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('complaints/settings')
export class ComplaintSettingsController {
  constructor(private readonly settingsService: ComplaintSettingsService) {}

  // ---------------------------------------------------------------------------
  // 1. Complaint Types (Master Data)
  // ---------------------------------------------------------------------------

  @Get('types')
  @ApiOperation({ summary: 'Get complaint types (all or active only)' })
  async getComplaintTypes(@Query('includeInactive') includeInactive?: string) {
    return this.settingsService.getComplaintTypes(includeInactive === 'true');
  }

  @Get('types/:id')
  @ApiOperation({ summary: 'Get single complaint type details' })
  async getComplaintTypeById(@Param('id', ParseIntPipe) id: number) {
    return this.settingsService.getComplaintTypeById(id);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post('types')
  @ApiOperation({ summary: 'Create new complaint type (Admin)' })
  async createComplaintType(@Req() req: any, @Body() dto: CreateComplaintTypeDto) {
    const adminId = req.user?.emp_id || 1;
    return this.settingsService.createComplaintType(dto, adminId);
  }

  @UseGuards(OrganizationAdminGuard)
  @Put('types/:id')
  @ApiOperation({ summary: 'Update existing complaint type (Admin)' })
  async updateComplaintType(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateComplaintTypeDto,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.settingsService.updateComplaintType(id, dto, adminId);
  }

  @UseGuards(OrganizationAdminGuard)
  @Patch('types/:id/toggle-status')
  @ApiOperation({ summary: 'Enable or disable a complaint type (Admin)' })
  async toggleComplaintTypeStatus(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.settingsService.toggleComplaintTypeStatus(id, adminId);
  }

  @UseGuards(OrganizationAdminGuard)
  @Delete('types/:id')
  @ApiOperation({ summary: 'Soft delete an unused complaint type (Admin)' })
  async deleteComplaintType(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.settingsService.deleteComplaintType(id, adminId);
  }

  // ---------------------------------------------------------------------------
  // 2. Module Rules & Change Log
  // ---------------------------------------------------------------------------

  @Get('general')
  @ApiOperation({ summary: 'Get complaint general SLA settings and rules' })
  async getSettings() {
    return this.settingsService.getSettings();
  }

  @UseGuards(OrganizationAdminGuard)
  @Put('general')
  @ApiOperation({ summary: 'Update complaint general SLA settings (Admin)' })
  async updateSettings(@Req() req: any, @Body() dto: UpdateComplaintSettingsDto) {
    const adminId = req.user?.emp_id || 1;
    return this.settingsService.updateSettings(dto, adminId);
  }

  @UseGuards(OrganizationAdminGuard)
  @Get('change-log')
  @ApiOperation({ summary: 'Get audit change log of settings modifications (Admin)' })
  async getChangeLog() {
    return this.settingsService.getChangeLog();
  }
}

