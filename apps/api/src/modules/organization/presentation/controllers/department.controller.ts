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
import { JwtAuthGuard } from '../../../../modules/auth/public-api';
import { OrganizationAdminGuard } from '../guards/organization-admin.guard';
import { mapDomainErrorToHttpException } from '../organization-error.mapper';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentQueryDto,
  DepartmentResponseDto,
  DepartmentListResponseDto,
  DepartmentOptionDto,
} from '../dto/department.dto';
import { ListDepartmentsUseCase } from '../../application/use-cases/list-departments.use-case';
import { GetDepartmentOptionsUseCase } from '../../application/use-cases/get-department-options.use-case';
import { GetDepartmentByIdUseCase } from '../../application/use-cases/get-department-by-id.use-case';
import { CreateDepartmentUseCase } from '../../application/use-cases/create-department.use-case';
import { UpdateDepartmentUseCase } from '../../application/use-cases/update-department.use-case';
import { DeleteDepartmentUseCase } from '../../application/use-cases/delete-department.use-case';

@ApiTags('Organization')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganizationAdminGuard)
@Controller('departments')
export class DepartmentController {
  constructor(
    private readonly listDepartmentsUseCase: ListDepartmentsUseCase,
    private readonly getDepartmentOptionsUseCase: GetDepartmentOptionsUseCase,
    private readonly getDepartmentByIdUseCase: GetDepartmentByIdUseCase,
    private readonly createDepartmentUseCase: CreateDepartmentUseCase,
    private readonly updateDepartmentUseCase: UpdateDepartmentUseCase,
    private readonly deleteDepartmentUseCase: DeleteDepartmentUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List departments with keyset pagination' })
  @ApiResponse({ status: 200, type: DepartmentListResponseDto })
  async list(@Query() query: DepartmentQueryDto): Promise<DepartmentListResponseDto> {
    try {
      return await this.listDepartmentsUseCase.execute(query);
    } catch (err) {
      throw mapDomainErrorToHttpException(err);
    }
  }

  @Get('options')
  @ApiOperation({ summary: 'Get active departments for dropdown select' })
  @ApiResponse({ status: 200, type: [DepartmentOptionDto] })
  async getOptions(): Promise<DepartmentOptionDto[]> {
    try {
      return await this.getDepartmentOptionsUseCase.execute();
    } catch (err) {
      throw mapDomainErrorToHttpException(err);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get department details by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Department ID' })
  @ApiResponse({ status: 200, type: DepartmentResponseDto })
  async getById(@Param('id', ParseIntPipe) id: number): Promise<DepartmentResponseDto> {
    try {
      return await this.getDepartmentByIdUseCase.execute(id);
    } catch (err) {
      throw mapDomainErrorToHttpException(err);
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create department' })
  @ApiBody({ type: CreateDepartmentDto })
  @ApiResponse({ status: 201, type: DepartmentResponseDto })
  async create(
    @Body() dto: CreateDepartmentDto,
    @Req() req: Request,
  ): Promise<DepartmentResponseDto> {
    try {
      const actingAdminId = req.user!.emp_id;
      return await this.createDepartmentUseCase.execute({
        name: dto.name,
        acting_admin_id: actingAdminId,
      });
    } catch (err) {
      throw mapDomainErrorToHttpException(err);
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update department' })
  @ApiParam({ name: 'id', type: Number, description: 'Department ID' })
  @ApiBody({ type: UpdateDepartmentDto })
  @ApiResponse({ status: 200, type: DepartmentResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepartmentDto,
    @Req() req: Request,
  ): Promise<DepartmentResponseDto> {
    try {
      const actingAdminId = req.user!.emp_id;
      return await this.updateDepartmentUseCase.execute({
        id,
        name: dto.name,
        is_active: dto.is_active,
        acting_admin_id: actingAdminId,
      });
    } catch (err) {
      throw mapDomainErrorToHttpException(err);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete department' })
  @ApiParam({ name: 'id', type: Number, description: 'Department ID' })
  @ApiResponse({ status: 204 })
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: Request): Promise<void> {
    try {
      const actingAdminId = req.user!.emp_id;
      await this.deleteDepartmentUseCase.execute({
        id,
        acting_admin_id: actingAdminId,
      });
    } catch (err) {
      throw mapDomainErrorToHttpException(err);
    }
  }
}
