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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../auth/public-api';
import { OrganizationAdminGuard } from '../guards/organization-admin.guard';
import { mapMasterDataErrorToHttpException } from '../master-data-error.mapper';
import {
  ListIndustriesQueryDto,
  IndustryOptionsQueryDto,
  CreateIndustryDto,
  UpdateIndustryDto,
  ListIndustriesResponseDto,
  IndustryOptionDto,
  IndustryDetailResponseDto,
} from '../dto/industry.dto';
import { ListIndustriesUseCase } from '../../application/use-cases/list-industries.use-case';
import { GetIndustryOptionsUseCase } from '../../application/use-cases/get-industry-options.use-case';
import { GetIndustryByIdUseCase } from '../../application/use-cases/get-industry-by-id.use-case';
import { CreateIndustryUseCase } from '../../application/use-cases/create-industry.use-case';
import { UpdateIndustryUseCase } from '../../application/use-cases/update-industry.use-case';
import { DeleteIndustryUseCase } from '../../application/use-cases/delete-industry.use-case';

@ApiTags('Master Data - Industries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganizationAdminGuard)
@Controller('industries')
export class IndustryController {
  constructor(
    private readonly listIndustriesUseCase: ListIndustriesUseCase,
    private readonly getIndustryOptionsUseCase: GetIndustryOptionsUseCase,
    private readonly getIndustryByIdUseCase: GetIndustryByIdUseCase,
    private readonly createIndustryUseCase: CreateIndustryUseCase,
    private readonly updateIndustryUseCase: UpdateIndustryUseCase,
    private readonly deleteIndustryUseCase: DeleteIndustryUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List industries with filters and keyset pagination' })
  @ApiResponse({ status: 200, type: ListIndustriesResponseDto })
  async list(@Query() query: ListIndustriesQueryDto): Promise<ListIndustriesResponseDto> {
    try {
      const result = await this.listIndustriesUseCase.execute(query);
      return {
        items: result.items.map((i) => ({
          industry_id: i.industry.industry_id,
          name: i.industry.name,
          parent: i.parent,
          sub_count: i.sub_count,
          company_count: i.company_count,
          is_active: i.industry.is_active,
          is_default: i.industry.is_default,
        })),
        next_cursor: result.next_cursor,
      };
    } catch (err) {
      throw mapMasterDataErrorToHttpException(err);
    }
  }

  @Get('options')
  @ApiOperation({ summary: 'Get active industry options (top-level or sub-industries of parent_id)' })
  @ApiResponse({ status: 200, type: [IndustryOptionDto] })
  async getOptions(@Query() query: IndustryOptionsQueryDto): Promise<IndustryOptionDto[]> {
    try {
      return await this.getIndustryOptionsUseCase.execute(query.parent_id);
    } catch (err) {
      throw mapMasterDataErrorToHttpException(err);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get industry details by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: IndustryDetailResponseDto })
  async getById(@Param('id', ParseIntPipe) id: number): Promise<IndustryDetailResponseDto> {
    try {
      const ind = await this.getIndustryByIdUseCase.execute(id);
      return {
        industry_id: ind.industry_id,
        name: ind.name,
        parent_id: ind.parent_id ?? null,
        is_active: ind.is_active,
        is_default: ind.is_default,
      };
    } catch (err) {
      throw mapMasterDataErrorToHttpException(err);
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an industry or sub-industry' })
  @ApiBody({ type: CreateIndustryDto })
  @ApiResponse({ status: 201, type: IndustryDetailResponseDto })
  async create(
    @Body() dto: CreateIndustryDto,
    @Req() req: Request,
  ): Promise<IndustryDetailResponseDto> {
    try {
      const actingAdminId = req.user!.emp_id;
      const ind = await this.createIndustryUseCase.execute({
        name: dto.name,
        parent_id: dto.parent_id,
        created_by: actingAdminId,
      });
      return {
        industry_id: ind.industry_id,
        name: ind.name,
        parent_id: ind.parent_id ?? null,
        is_active: ind.is_active,
        is_default: ind.is_default,
      };
    } catch (err) {
      throw mapMasterDataErrorToHttpException(err);
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update industry name or active status' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateIndustryDto })
  @ApiResponse({ status: 200, type: IndustryDetailResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIndustryDto,
    @Req() req: Request,
  ): Promise<IndustryDetailResponseDto> {
    try {
      const actingAdminId = req.user!.emp_id;
      const ind = await this.updateIndustryUseCase.execute({
        id,
        name: dto.name,
        is_active: dto.is_active,
        updated_by: actingAdminId,
      });
      return {
        industry_id: ind.industry_id,
        name: ind.name,
        parent_id: ind.parent_id ?? null,
        is_active: ind.is_active,
        is_default: ind.is_default,
      };
    } catch (err) {
      throw mapMasterDataErrorToHttpException(err);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete an industry' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204 })
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: Request): Promise<void> {
    try {
      const actingAdminId = req.user!.emp_id;
      await this.deleteIndustryUseCase.execute(id, actingAdminId);
    } catch (err) {
      throw mapMasterDataErrorToHttpException(err);
    }
  }
}
