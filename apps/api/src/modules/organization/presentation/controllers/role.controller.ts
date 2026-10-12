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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../../modules/auth/public-api';
import { OrganizationAdminGuard } from '../guards/organization-admin.guard';
import { mapDomainErrorToHttpException } from '../organization-error.mapper';
import {
  CreateRoleDto,
  UpdateRoleDto,
  RoleQueryDto,
  RoleResponseDto,
  RoleListResponseDto,
  RoleOptionDto,
} from '../dto/role.dto';
import { ListRolesUseCase } from '../../application/use-cases/list-roles.use-case';
import { GetRoleOptionsUseCase } from '../../application/use-cases/get-role-options.use-case';
import { GetRoleByIdUseCase } from '../../application/use-cases/get-role-by-id.use-case';
import { CreateRoleUseCase } from '../../application/use-cases/create-role.use-case';
import { UpdateRoleUseCase } from '../../application/use-cases/update-role.use-case';
import { DeleteRoleUseCase } from '../../application/use-cases/delete-role.use-case';

@ApiTags('Organization')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganizationAdminGuard)
@Controller('roles')
export class RoleController {
  constructor(
    private readonly listRolesUseCase: ListRolesUseCase,
    private readonly getRoleOptionsUseCase: GetRoleOptionsUseCase,
    private readonly getRoleByIdUseCase: GetRoleByIdUseCase,
    private readonly createRoleUseCase: CreateRoleUseCase,
    private readonly updateRoleUseCase: UpdateRoleUseCase,
    private readonly deleteRoleUseCase: DeleteRoleUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List roles with keyset pagination' })
  @ApiResponse({ status: 200, type: RoleListResponseDto })
  async list(@Query() query: RoleQueryDto): Promise<RoleListResponseDto> {
    try {
      return await this.listRolesUseCase.execute(query);
    } catch (err) {
      throw mapDomainErrorToHttpException(err);
    }
  }

  @Get('options')
  @ApiOperation({ summary: 'Get active roles for a department' })
  @ApiQuery({ name: 'dep_id', type: Number, required: true })
  @ApiResponse({ status: 200, type: [RoleOptionDto] })
  async getOptions(@Query('dep_id', ParseIntPipe) depId: number): Promise<RoleOptionDto[]> {
    try {
      return await this.getRoleOptionsUseCase.execute(depId);
    } catch (err) {
      throw mapDomainErrorToHttpException(err);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role details by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Role ID' })
  @ApiResponse({ status: 200, type: RoleResponseDto })
  async getById(@Param('id', ParseIntPipe) id: number): Promise<RoleResponseDto> {
    try {
      return await this.getRoleByIdUseCase.execute(id);
    } catch (err) {
      throw mapDomainErrorToHttpException(err);
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create role' })
  @ApiBody({ type: CreateRoleDto })
  @ApiResponse({ status: 201, type: RoleResponseDto })
  async create(@Body() dto: CreateRoleDto, @Req() req: Request): Promise<RoleResponseDto> {
    try {
      const actingAdminId = req.user!.emp_id;
      return await this.createRoleUseCase.execute({
        role_name: dto.role_name,
        dep_id: dto.dep_id,
        description: dto.description,
        acting_admin_id: actingAdminId,
      });
    } catch (err) {
      throw mapDomainErrorToHttpException(err);
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update role' })
  @ApiParam({ name: 'id', type: Number, description: 'Role ID' })
  @ApiBody({ type: UpdateRoleDto })
  @ApiResponse({ status: 200, type: RoleResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
    @Req() req: Request,
  ): Promise<RoleResponseDto> {
    try {
      const actingAdminId = req.user!.emp_id;
      return await this.updateRoleUseCase.execute({
        id,
        role_name: dto.role_name,
        description: dto.description,
        is_active: dto.is_active,
        acting_admin_id: actingAdminId,
      });
    } catch (err) {
      throw mapDomainErrorToHttpException(err);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete role' })
  @ApiParam({ name: 'id', type: Number, description: 'Role ID' })
  @ApiResponse({ status: 204 })
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: Request): Promise<void> {
    try {
      const actingAdminId = req.user!.emp_id;
      await this.deleteRoleUseCase.execute({
        id,
        acting_admin_id: actingAdminId,
      });
    } catch (err) {
      throw mapDomainErrorToHttpException(err);
    }
  }
}
