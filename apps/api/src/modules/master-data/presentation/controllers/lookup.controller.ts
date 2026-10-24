import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../auth/public-api';
import { OrganizationAdminGuard } from '../guards/organization-admin.guard';
import { CompanyAdminGuard } from '../guards/company-admin.guard';
import { mapMasterDataErrorToHttpException } from '../master-data-error.mapper';
import {
  LookupOptionsQueryDto,
  LookupOptionDto,
  ListLookupsQueryDto,
  MasterLookupItemDto,
  CreateLookupDto,
  UpdateLookupDto,
} from '../dto/lookup.dto';
import { GetLookupOptionsUseCase } from '../../application/use-cases/get-lookup-options.use-case';
import { ListLookupsUseCase } from '../../application/use-cases/list-lookups.use-case';
import { CreateLookupUseCase } from '../../application/use-cases/create-lookup.use-case';
import { UpdateLookupUseCase } from '../../application/use-cases/update-lookup.use-case';
import { DeleteLookupUseCase } from '../../application/use-cases/delete-lookup.use-case';
import { MasterLookupItem } from '../../application/ports/master-lookup.repository.port';

function toDto(item: MasterLookupItem): MasterLookupItemDto {
  return {
    id: item.id,
    lookup_type: item.lookup_type,
    code: item.code,
    label: item.label,
    sort_order: item.sort_order,
    is_active: item.is_active,
    created_at: item.created_at,
  };
}

@ApiTags('Master Data - Lookups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CompanyAdminGuard)
@Controller('lookups')
export class LookupController {
  constructor(
    private readonly getLookupOptionsUseCase: GetLookupOptionsUseCase,
    private readonly listLookupsUseCase: ListLookupsUseCase,
    private readonly createLookupUseCase: CreateLookupUseCase,
    private readonly updateLookupUseCase: UpdateLookupUseCase,
    private readonly deleteLookupUseCase: DeleteLookupUseCase,
  ) {}

  // ---- Public-ish: Get options (active only, for dropdowns) ----

  @Get('options')
  @ApiOperation({ summary: 'Get active lookup options by type (for dropdowns)' })
  @ApiResponse({ status: 200, type: [LookupOptionDto] })
  async getOptions(@Query() query: LookupOptionsQueryDto): Promise<LookupOptionDto[]> {
    try {
      return await this.getLookupOptionsUseCase.execute(query.type);
    } catch (err) {
      throw mapMasterDataErrorToHttpException(err);
    }
  }

  // ---- Admin CRUD: Manage all items of a lookup type ----

  @Get()
  @UseGuards(OrganizationAdminGuard)
  @ApiOperation({ summary: 'List all lookup items (including inactive) by type' })
  @ApiResponse({ status: 200, type: [MasterLookupItemDto] })
  async listAll(@Query() query: ListLookupsQueryDto): Promise<MasterLookupItemDto[]> {
    try {
      const items = await this.listLookupsUseCase.execute(query.type);
      return items.map(toDto);
    } catch (err) {
      throw mapMasterDataErrorToHttpException(err);
    }
  }

  @Post()
  @UseGuards(OrganizationAdminGuard)
  @ApiOperation({ summary: 'Create a new lookup item' })
  @ApiResponse({ status: 201, type: MasterLookupItemDto })
  async create(
    @Query() query: ListLookupsQueryDto,
    @Body() body: CreateLookupDto,
    @Req() req: Request,
  ): Promise<MasterLookupItemDto> {
    try {
      const item = await this.createLookupUseCase.execute({
        lookup_type: query.type,
        label: body.label,
        code: body.code,
        sort_order: body.sort_order,
        is_active: body.is_active,
        actor_id: req.user!.emp_id,
      });
      return toDto(item);
    } catch (err) {
      throw mapMasterDataErrorToHttpException(err);
    }
  }

  @Patch(':id')
  @UseGuards(OrganizationAdminGuard)
  @ApiOperation({ summary: 'Update a lookup item' })
  @ApiResponse({ status: 200, type: MasterLookupItemDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateLookupDto,
    @Req() req: Request,
  ): Promise<MasterLookupItemDto> {
    try {
      const item = await this.updateLookupUseCase.execute({
        id,
        label: body.label,
        code: body.code,
        sort_order: body.sort_order,
        is_active: body.is_active,
        actor_id: req.user!.emp_id,
      });
      return toDto(item);
    } catch (err) {
      throw mapMasterDataErrorToHttpException(err);
    }
  }

  @Delete(':id')
  @UseGuards(OrganizationAdminGuard)
  @ApiOperation({ summary: 'Delete (soft delete) a lookup item' })
  @ApiResponse({ status: 204 })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ): Promise<void> {
    try {
      await this.deleteLookupUseCase.execute(id, req.user!.emp_id);
    } catch (err) {
      throw mapMasterDataErrorToHttpException(err);
    }
  }
}
