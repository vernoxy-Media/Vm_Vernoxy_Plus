import {
  Controller,
  Get,
  Post,
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
import { LicenseSettingsService } from '../../application/services/license-settings.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateVendorDto,
  UpdateVendorDto,
  CreateReasonDto,
  UpdateReasonDto,
  UpdateLicenseSettingsDto,
  AddManagerDto,
} from '../dto/license-settings.dto';

@ApiTags('Software License Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('licenses/settings')
export class LicenseSettingsController {
  constructor(private readonly settingsService: LicenseSettingsService) {}

  // ---------------------------------------------------------------------------
  // 1. Settings Singleton
  // ---------------------------------------------------------------------------
  @Get()
  @ApiOperation({ summary: 'Get current license settings' })
  async getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch()
  @ApiOperation({ summary: 'Update license settings' })
  async updateSettings(@Req() req: any, @Body() dto: UpdateLicenseSettingsDto) {
    const empId = req.user?.emp_id || 1;
    return this.settingsService.updateSettings(dto, empId);
  }

  // ---------------------------------------------------------------------------
  // 2. Categories
  // ---------------------------------------------------------------------------
  @Get('categories')
  @ApiOperation({ summary: 'List categories' })
  async getCategories(@Query('includeInactive') includeInactive?: string) {
    return this.settingsService.getCategories(includeInactive === 'true');
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create category' })
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.settingsService.createCategory(dto);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update category' })
  async updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.settingsService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete or deactivate category' })
  async deleteCategory(@Param('id', ParseIntPipe) id: number) {
    return this.settingsService.deleteCategory(id);
  }

  // ---------------------------------------------------------------------------
  // 3. Vendors
  // ---------------------------------------------------------------------------
  @Get('vendors')
  @ApiOperation({ summary: 'List vendors' })
  async getVendors(@Query('includeInactive') includeInactive?: string) {
    return this.settingsService.getVendors(includeInactive === 'true');
  }

  @Post('vendors')
  @ApiOperation({ summary: 'Create vendor' })
  async createVendor(@Body() dto: CreateVendorDto) {
    return this.settingsService.createVendor(dto);
  }

  @Patch('vendors/:id')
  @ApiOperation({ summary: 'Update vendor' })
  async updateVendor(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVendorDto,
  ) {
    return this.settingsService.updateVendor(id, dto);
  }

  @Delete('vendors/:id')
  @ApiOperation({ summary: 'Delete or deactivate vendor' })
  async deleteVendor(@Param('id', ParseIntPipe) id: number) {
    return this.settingsService.deleteVendor(id);
  }

  // ---------------------------------------------------------------------------
  // 4. Revoke Reasons
  // ---------------------------------------------------------------------------
  @Get('revoke-reasons')
  @ApiOperation({ summary: 'List revoke reasons' })
  async getRevokeReasons(@Query('includeInactive') includeInactive?: string) {
    return this.settingsService.getRevokeReasons(includeInactive === 'true');
  }

  @Post('revoke-reasons')
  @ApiOperation({ summary: 'Create revoke reason' })
  async createRevokeReason(@Body() dto: CreateReasonDto) {
    return this.settingsService.createRevokeReason(dto);
  }

  @Patch('revoke-reasons/:id')
  @ApiOperation({ summary: 'Update revoke reason' })
  async updateRevokeReason(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReasonDto,
  ) {
    return this.settingsService.updateRevokeReason(id, dto);
  }

  @Delete('revoke-reasons/:id')
  @ApiOperation({ summary: 'Delete or deactivate revoke reason' })
  async deleteRevokeReason(@Param('id', ParseIntPipe) id: number) {
    return this.settingsService.deleteRevokeReason(id);
  }

  // ---------------------------------------------------------------------------
  // 5. Discontinue Reasons
  // ---------------------------------------------------------------------------
  @Get('discontinue-reasons')
  @ApiOperation({ summary: 'List discontinue reasons' })
  async getDiscontinueReasons(@Query('includeInactive') includeInactive?: string) {
    return this.settingsService.getDiscontinueReasons(includeInactive === 'true');
  }

  @Post('discontinue-reasons')
  @ApiOperation({ summary: 'Create discontinue reason' })
  async createDiscontinueReason(@Body() dto: CreateReasonDto) {
    return this.settingsService.createDiscontinueReason(dto);
  }

  @Patch('discontinue-reasons/:id')
  @ApiOperation({ summary: 'Update discontinue reason' })
  async updateDiscontinueReason(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReasonDto,
  ) {
    return this.settingsService.updateDiscontinueReason(id, dto);
  }

  @Delete('discontinue-reasons/:id')
  @ApiOperation({ summary: 'Delete or deactivate discontinue reason' })
  async deleteDiscontinueReason(@Param('id', ParseIntPipe) id: number) {
    return this.settingsService.deleteDiscontinueReason(id);
  }

  // ---------------------------------------------------------------------------
  // 6. License Managers
  // ---------------------------------------------------------------------------
  @Get('managers')
  @ApiOperation({ summary: 'List software license managers' })
  async getManagers() {
    return this.settingsService.getManagers();
  }

  @Post('managers')
  @ApiOperation({ summary: 'Add an employee as software license manager' })
  async addManager(@Req() req: any, @Body() dto: AddManagerDto) {
    const appointedBy = req.user?.emp_id || 1;
    return this.settingsService.addManager(dto.emp_id, appointedBy);
  }

  @Delete('managers/:empId')
  @ApiOperation({ summary: 'Remove software license manager' })
  async removeManager(@Param('empId', ParseIntPipe) empId: number) {
    return this.settingsService.removeManager(empId);
  }
}

