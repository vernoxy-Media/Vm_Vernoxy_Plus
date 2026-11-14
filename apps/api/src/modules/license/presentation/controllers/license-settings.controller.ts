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
import { LicenseAccessService } from '../../application/services/license-access.service';
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
  constructor(
    private readonly settingsService: LicenseSettingsService,
    private readonly access: LicenseAccessService,
  ) {}

  /** BFD 13: Admin edits settings; License Managers view them and may add a vendor from the form. */
  private async need(req: any, level: 'admin' | 'manage' | 'register' | 'viewAll') {
    const v = await this.access.viewer(Number(req.user?.emp_id));
    if (level === 'admin') this.access.assertAdmin(v);
    else if (level === 'manage') this.access.assertManage(v);
    else if (level === 'viewAll') this.access.assertViewAll(v);
    else this.access.assertRegister(v);
  }

  // ---------------------------------------------------------------------------
  // 1. Settings Singleton
  // ---------------------------------------------------------------------------
  @Get()
  @ApiOperation({ summary: 'Get current license settings' })
  async getSettings(@Req() req: any) {
    await this.need(req, 'manage');
    return this.settingsService.getSettings();
  }

  @Patch()
  @ApiOperation({ summary: 'Update license settings' })
  async updateSettings(@Req() req: any, @Body() dto: UpdateLicenseSettingsDto) {
    await this.need(req, 'admin');
    const empId = req.user?.emp_id || 1;
    return this.settingsService.updateSettings(dto, empId);
  }

  // ---------------------------------------------------------------------------
  // 2. Categories
  // ---------------------------------------------------------------------------
  @Get('categories')
  @ApiOperation({ summary: 'List categories' })
  async getCategories(@Req() req: any, @Query('includeInactive') includeInactive?: string) {
    await this.need(req, 'register');
    return this.settingsService.getCategories(includeInactive === 'true');
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create category' })
  async createCategory(@Req() req: any, @Body() dto: CreateCategoryDto) {
    await this.need(req, 'admin');
    return this.settingsService.createCategory(dto);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update category' })
  async updateCategory(@Req() req: any, 
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    await this.need(req, 'admin');
    return this.settingsService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete or deactivate category' })
  async deleteCategory(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    await this.need(req, 'admin');
    return this.settingsService.deleteCategory(id);
  }

  // ---------------------------------------------------------------------------
  // 3. Vendors
  // ---------------------------------------------------------------------------
  @Get('vendors')
  @ApiOperation({ summary: 'List vendors' })
  async getVendors(@Req() req: any, @Query('includeInactive') includeInactive?: string) {
    await this.need(req, 'register');
    return this.settingsService.getVendors(includeInactive === 'true');
  }

  @Post('vendors')
  @ApiOperation({ summary: 'Create vendor' })
  async createVendor(@Req() req: any, @Body() dto: CreateVendorDto) {
    await this.need(req, 'manage');
    return this.settingsService.createVendor(dto);
  }

  @Patch('vendors/:id')
  @ApiOperation({ summary: 'Update vendor' })
  async updateVendor(@Req() req: any, 
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVendorDto,
  ) {
    await this.need(req, 'admin');
    return this.settingsService.updateVendor(id, dto);
  }

  @Delete('vendors/:id')
  @ApiOperation({ summary: 'Delete or deactivate vendor' })
  async deleteVendor(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    await this.need(req, 'admin');
    return this.settingsService.deleteVendor(id);
  }

  // ---------------------------------------------------------------------------
  // 4. Revoke Reasons
  // ---------------------------------------------------------------------------
  @Get('revoke-reasons')
  @ApiOperation({ summary: 'List revoke reasons' })
  async getRevokeReasons(@Req() req: any, @Query('includeInactive') includeInactive?: string) {
    await this.need(req, 'register');
    return this.settingsService.getRevokeReasons(includeInactive === 'true');
  }

  @Post('revoke-reasons')
  @ApiOperation({ summary: 'Create revoke reason' })
  async createRevokeReason(@Req() req: any, @Body() dto: CreateReasonDto) {
    await this.need(req, 'admin');
    return this.settingsService.createRevokeReason(dto);
  }

  @Patch('revoke-reasons/:id')
  @ApiOperation({ summary: 'Update revoke reason' })
  async updateRevokeReason(@Req() req: any, 
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReasonDto,
  ) {
    await this.need(req, 'admin');
    return this.settingsService.updateRevokeReason(id, dto);
  }

  @Delete('revoke-reasons/:id')
  @ApiOperation({ summary: 'Delete or deactivate revoke reason' })
  async deleteRevokeReason(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    await this.need(req, 'admin');
    return this.settingsService.deleteRevokeReason(id);
  }

  // ---------------------------------------------------------------------------
  // 5. Discontinue Reasons
  // ---------------------------------------------------------------------------
  @Get('discontinue-reasons')
  @ApiOperation({ summary: 'List discontinue reasons' })
  async getDiscontinueReasons(@Req() req: any, @Query('includeInactive') includeInactive?: string) {
    await this.need(req, 'register');
    return this.settingsService.getDiscontinueReasons(includeInactive === 'true');
  }

  @Post('discontinue-reasons')
  @ApiOperation({ summary: 'Create discontinue reason' })
  async createDiscontinueReason(@Req() req: any, @Body() dto: CreateReasonDto) {
    await this.need(req, 'admin');
    return this.settingsService.createDiscontinueReason(dto);
  }

  @Patch('discontinue-reasons/:id')
  @ApiOperation({ summary: 'Update discontinue reason' })
  async updateDiscontinueReason(@Req() req: any, 
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReasonDto,
  ) {
    await this.need(req, 'admin');
    return this.settingsService.updateDiscontinueReason(id, dto);
  }

  @Delete('discontinue-reasons/:id')
  @ApiOperation({ summary: 'Delete or deactivate discontinue reason' })
  async deleteDiscontinueReason(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    await this.need(req, 'admin');
    return this.settingsService.deleteDiscontinueReason(id);
  }

  // ---------------------------------------------------------------------------
  // 6. License Managers
  // ---------------------------------------------------------------------------
  @Get('managers')
  @ApiOperation({ summary: 'List software license managers' })
  async getManagers(@Req() req: any) {
    await this.need(req, 'manage');
    return this.settingsService.getManagers();
  }

  @Post('managers')
  @ApiOperation({ summary: 'Add an employee as software license manager' })
  async addManager(@Req() req: any, @Body() dto: AddManagerDto) {
    await this.need(req, 'admin');
    const appointedBy = req.user?.emp_id || 1;
    return this.settingsService.addManager(dto.emp_id, appointedBy);
  }

  @Delete('managers/:empId')
  @ApiOperation({ summary: 'Remove software license manager' })
  async removeManager(@Req() req: any, @Param('empId', ParseIntPipe) empId: number) {
    await this.need(req, 'admin');
    return this.settingsService.removeManager(empId);
  }
}

