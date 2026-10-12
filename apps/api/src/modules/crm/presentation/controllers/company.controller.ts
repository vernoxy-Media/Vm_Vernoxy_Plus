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
  Res,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../../auth/public-api';
import { CompanyAdminGuard } from '../guards/company-admin.guard';
import { mapCrmErrorToHttpException } from '../crm-error.mapper';
import {
  ListCompaniesQueryDto,
  CompanyOptionsQueryDto,
  CompanyDuplicateCheckQueryDto,
  CreateCompanyDto,
  UpdateCompanyDto,
  ListCompaniesResponseDto,
  CompanyOptionDto,
  CompanyDuplicateMatchDto,
  CompanyDetailResponseDto,
} from '../dto/company.dto';
import { ListCompaniesUseCase } from '../../application/use-cases/list-companies.use-case';
import { GetCompanyOptionsUseCase } from '../../application/use-cases/get-company-options.use-case';
import { CheckCompanyDuplicatesUseCase } from '../../application/use-cases/check-company-duplicates.use-case';
import { GetCompanyDetailUseCase } from '../../application/use-cases/get-company-detail.use-case';
import { CreateCompanyUseCase } from '../../application/use-cases/create-company.use-case';
import { UpdateCompanyUseCase } from '../../application/use-cases/update-company.use-case';
import { DeleteCompanyUseCase } from '../../application/use-cases/delete-company.use-case';

@ApiTags('CRM - Companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CompanyAdminGuard)
@Controller('companies')
export class CompanyController {
  constructor(
    private readonly listCompaniesUseCase: ListCompaniesUseCase,
    private readonly getCompanyOptionsUseCase: GetCompanyOptionsUseCase,
    private readonly checkDuplicatesUseCase: CheckCompanyDuplicatesUseCase,
    private readonly getCompanyDetailUseCase: GetCompanyDetailUseCase,
    private readonly createCompanyUseCase: CreateCompanyUseCase,
    private readonly updateCompanyUseCase: UpdateCompanyUseCase,
    private readonly deleteCompanyUseCase: DeleteCompanyUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List companies with filters and keyset pagination' })
  @ApiResponse({ status: 200, type: ListCompaniesResponseDto })
  async list(@Query() query: ListCompaniesQueryDto): Promise<ListCompaniesResponseDto> {
    try {
      return await this.listCompaniesUseCase.execute(query);
    } catch (err) {
      throw mapCrmErrorToHttpException(err);
    }
  }

  @Get('options')
  @ApiOperation({ summary: 'Get active company options for parent picker' })
  @ApiResponse({ status: 200, type: [CompanyOptionDto] })
  async getOptions(@Query() query: CompanyOptionsQueryDto): Promise<CompanyOptionDto[]> {
    try {
      return await this.getCompanyOptionsUseCase.execute(query);
    } catch (err) {
      throw mapCrmErrorToHttpException(err);
    }
  }

  @Get('duplicate-check')
  @ApiOperation({ summary: 'Check for potential duplicate companies' })
  @ApiResponse({ status: 200, type: [CompanyDuplicateMatchDto] })
  async checkDuplicates(@Query() query: CompanyDuplicateCheckQueryDto): Promise<CompanyDuplicateMatchDto[]> {
    try {
      return await this.checkDuplicatesUseCase.execute(query);
    } catch (err) {
      throw mapCrmErrorToHttpException(err);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company detail by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: CompanyDetailResponseDto })
  async getById(@Param('id', ParseIntPipe) id: number): Promise<CompanyDetailResponseDto> {
    try {
      return await this.getCompanyDetailUseCase.execute(id);
    } catch (err) {
      throw mapCrmErrorToHttpException(err);
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create company with channels and contacts' })
  @ApiBody({ type: CreateCompanyDto })
  @ApiResponse({ status: 201, type: CompanyDetailResponseDto })
  async create(
    @Body() dto: CreateCompanyDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const actingAdminId = req.user!.emp_id;
      const result = await this.createCompanyUseCase.execute({
        name: dto.name,
        parent_company_id: dto.parent_company_id,
        customer_type_id: dto.customer_type_id,
        industry_id: dto.industry_id,
        sub_industry_id: dto.sub_industry_id,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        owner_id: dto.owner_id,
        channels: dto.channels,
        contacts: dto.contacts,
        acting_admin_id: actingAdminId,
      });

      res.status(HttpStatus.CREATED)
        .header('Location', `/api/v1/companies/${result.company_id}`)
        .json(result);
    } catch (err) {
      throw mapCrmErrorToHttpException(err);
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update company with channels and contacts diff' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateCompanyDto })
  @ApiResponse({ status: 200, type: CompanyDetailResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompanyDto,
    @Req() req: Request,
  ): Promise<CompanyDetailResponseDto> {
    try {
      const actingAdminId = req.user!.emp_id;
      return await this.updateCompanyUseCase.execute({
        id,
        name: dto.name,
        parent_company_id: dto.parent_company_id,
        customer_type_id: dto.customer_type_id,
        industry_id: dto.industry_id,
        sub_industry_id: dto.sub_industry_id,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        owner_id: dto.owner_id,
        is_active: dto.is_active,
        channels: dto.channels,
        contacts: dto.contacts,
        acting_admin_id: actingAdminId,
      });
    } catch (err) {
      throw mapCrmErrorToHttpException(err);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete company, channels and contacts links' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204 })
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: Request): Promise<void> {
    try {
      const actingAdminId = req.user!.emp_id;
      await this.deleteCompanyUseCase.execute({
        id,
        acting_admin_id: actingAdminId,
      });
    } catch (err) {
      throw mapCrmErrorToHttpException(err);
    }
  }
}
