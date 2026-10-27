import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Put,
  UseInterceptors,
  UploadedFile,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
  BadRequestException,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../../modules/auth/public-api';
import { OrganizationAdminGuard } from '../guards/organization-admin.guard';
import { mapDomainErrorToHttpException } from '../organization-error.mapper';
import { StorageValidator } from '../../../storage/public-api';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  DeactivateEmployeeDto,
  DeactivateWarningResponseDto,
  EmployeeQueryDto,
  EmployeeResponseDto,
  EmployeeListResponseDto,
  EmployeeOptionDto,
  EmployeeHistoryItemDto,
} from '../dto/employee.dto';
import { ListEmployeesUseCase } from '../../application/use-cases/list-employees.use-case';
import { GetEmployeeOptionsUseCase } from '../../application/use-cases/get-employee-options.use-case';
import { GetEmployeeByIdUseCase } from '../../application/use-cases/get-employee-by-id.use-case';
import { CreateEmployeeUseCase } from '../../application/use-cases/create-employee.use-case';
import { UpdateEmployeeUseCase } from '../../application/use-cases/update-employee.use-case';
import { DeleteEmployeeUseCase } from '../../application/use-cases/delete-employee.use-case';
import { UploadEmployeePhotoUseCase } from '../../application/use-cases/upload-employee-photo.use-case';
import { RemoveEmployeePhotoUseCase } from '../../application/use-cases/remove-employee-photo.use-case';
import { DeactivateEmployeeUseCase } from '../../application/use-cases/deactivate-employee.use-case';
import { GetDeactivateWarningUseCase } from '../../application/use-cases/get-deactivate-warning.use-case';
import { GetEmployeeHistoryUseCase } from '../../application/use-cases/get-employee-history.use-case';

function toEmployeeResponseDto(emp: any): EmployeeResponseDto {
  if (!emp) return emp;
  const { profile_picture, ...rest } = emp;
  return rest as EmployeeResponseDto;
}

@ApiTags('Organization')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganizationAdminGuard)
@Controller('employees')
export class EmployeeController {
  constructor(
    private readonly listEmployeesUseCase: ListEmployeesUseCase,
    private readonly getEmployeeOptionsUseCase: GetEmployeeOptionsUseCase,
    private readonly getEmployeeByIdUseCase: GetEmployeeByIdUseCase,
    private readonly createEmployeeUseCase: CreateEmployeeUseCase,
    private readonly updateEmployeeUseCase: UpdateEmployeeUseCase,
    private readonly deleteEmployeeUseCase: DeleteEmployeeUseCase,
    private readonly uploadPhotoUseCase: UploadEmployeePhotoUseCase,
    private readonly removePhotoUseCase: RemoveEmployeePhotoUseCase,
    private readonly deactivateEmployeeUseCase: DeactivateEmployeeUseCase,
    private readonly getDeactivateWarningUseCase: GetDeactivateWarningUseCase,
    private readonly getEmployeeHistoryUseCase: GetEmployeeHistoryUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List employees with keyset pagination' })
  @ApiResponse({ status: 200, type: EmployeeListResponseDto })
  async list(@Query() query: EmployeeQueryDto): Promise<EmployeeListResponseDto> {
    try {
      const result = await this.listEmployeesUseCase.execute(query);
      return {
        ...result,
        items: result.items.map(toEmployeeResponseDto),
      };
    } catch (err) {
      throw mapDomainErrorToHttpException(err);
    }
  }

  @Get('options')
  @ApiOperation({ summary: 'Get active employees for manager dropdown select' })
  @ApiQuery({ name: 'q', type: String, required: false })
  @ApiResponse({ status: 200, type: [EmployeeOptionDto] })
  async getOptions(@Query('q') q?: string): Promise<EmployeeOptionDto[]> {
    try {
      return await this.getEmployeeOptionsUseCase.execute(q);
    } catch (err) {
      throw mapDomainErrorToHttpException(err);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee details by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Employee ID' })
  @ApiResponse({ status: 200, type: EmployeeResponseDto })
  async getById(@Param('id', ParseIntPipe) id: number): Promise<EmployeeResponseDto> {
    try {
      const emp = await this.getEmployeeByIdUseCase.execute(id);
      return toEmployeeResponseDto(emp);
    } catch (err) {
      throw mapDomainErrorToHttpException(err);
    }
  }

  @Get(':id/deactivate-warning')
  @ApiOperation({ summary: 'Get direct reports warning before deactivating an employee' })
  @ApiParam({ name: 'id', type: Number, description: 'Employee ID' })
  @ApiResponse({ status: 200, type: DeactivateWarningResponseDto })
  async getDeactivateWarning(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DeactivateWarningResponseDto> {
    try {
      return await this.getDeactivateWarningUseCase.execute(id);
    } catch (err) {
      throw mapDomainErrorToHttpException(err);
    }
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate an employee (with reason, termination date, and notes)' })
  @ApiParam({ name: 'id', type: Number, description: 'Employee ID' })
  @ApiBody({ type: DeactivateEmployeeDto })
  @ApiResponse({ status: 200, type: EmployeeResponseDto })
  async deactivate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DeactivateEmployeeDto,
    @Req() req: Request,
  ): Promise<EmployeeResponseDto> {
    try {
      const actingAdminId = req.user!.emp_id;
      const emp = await this.deactivateEmployeeUseCase.execute({
        id,
        termination_date: dto.termination_date,
        reason: dto.reason,
        notes: dto.notes,
        acting_admin_id: actingAdminId,
      });

      return toEmployeeResponseDto(emp);
    } catch (err) {
      throw mapDomainErrorToHttpException(err);
    }
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get employee milestone and growth timeline history' })
  @ApiParam({ name: 'id', type: Number, description: 'Employee ID' })
  @ApiResponse({ status: 200, type: [EmployeeHistoryItemDto] })
  async getHistory(@Param('id', ParseIntPipe) id: number): Promise<any[]> {
    try {
      return await this.getEmployeeHistoryUseCase.execute(id);
    } catch (err) {
      throw mapDomainErrorToHttpException(err);
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create employee and provision credentials' })
  @ApiBody({ type: CreateEmployeeDto })
  @ApiResponse({ status: 201, type: EmployeeResponseDto })
  async create(
    @Body() dto: CreateEmployeeDto,
    @Req() req: Request,
  ): Promise<EmployeeResponseDto> {
    try {
      const actingAdminId = req.user!.emp_id;
      const emp = await this.createEmployeeUseCase.execute({
        name: dto.name,
        email: dto.email,
        mob: dto.mob,
        password: dto.password,
        dep_id: dto.dep_id,
        department_ids: dto.department_ids,
        role_id: dto.role_id,
        reporting_manager: dto.reporting_manager,
        joining_date: dto.joining_date,
        gender_id: dto.gender_id,
        personal_email: dto.personal_email,
        office_email: dto.office_email,
        birth_date: dto.birth_date,
        blood_group: dto.blood_group,
        address: dto.address,
        emergency_contact_name: dto.emergency_contact_name,
        emergency_contact_number: dto.emergency_contact_number,
        emergency_contact_relation: dto.emergency_contact_relation,
        employment_type_id: dto.employment_type_id,
        salary: dto.salary,
        pf: dto.pf,
        acting_admin_id: actingAdminId,
      });
      return toEmployeeResponseDto(emp);
    } catch (err) {
      throw mapDomainErrorToHttpException(err);
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update employee details' })
  @ApiParam({ name: 'id', type: Number, description: 'Employee ID' })
  @ApiBody({ type: UpdateEmployeeDto })
  @ApiResponse({ status: 200, type: EmployeeResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
    @Req() req: Request,
  ): Promise<EmployeeResponseDto> {
    try {
      const actingAdminId = req.user!.emp_id;
      const emp = await this.updateEmployeeUseCase.execute({
        id,
        name: dto.name,
        email: dto.email,
        mob: dto.mob,
        dep_id: dto.dep_id,
        department_ids: dto.department_ids,
        role_id: dto.role_id,
        reporting_manager: dto.reporting_manager,
        joining_date: dto.joining_date,
        exit_date: dto.exit_date,
        status: dto.status,
        gender_id: dto.gender_id,
        personal_email: dto.personal_email,
        office_email: dto.office_email,
        birth_date: dto.birth_date,
        blood_group: dto.blood_group,
        address: dto.address,
        emergency_contact_name: dto.emergency_contact_name,
        emergency_contact_number: dto.emergency_contact_number,
        emergency_contact_relation: dto.emergency_contact_relation,
        employment_type_id: dto.employment_type_id,
        salary: dto.salary,
        pf: dto.pf,
        termination_date: dto.termination_date,
        deactivation_reason: dto.deactivation_reason,
        deactivation_notes: dto.deactivation_notes,
        acting_admin_id: actingAdminId,
      });
      return toEmployeeResponseDto(emp);
    } catch (err) {
      throw mapDomainErrorToHttpException(err);
    }
  }


  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete employee' })
  @ApiParam({ name: 'id', type: Number, description: 'Employee ID' })
  @ApiResponse({ status: 204 })
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: Request): Promise<void> {
    try {
      const actingAdminId = req.user!.emp_id;
      await this.deleteEmployeeUseCase.execute({
        id,
        acting_admin_id: actingAdminId,
      });
    } catch (err) {
      throw mapDomainErrorToHttpException(err);
    }
  }

  @Put(':id/photo')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload employee profile photo (max 5MB, JPEG/PNG)' })
  @ApiParam({ name: 'id', type: Number, description: 'Employee ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Profile photo image file',
        },
      },
    },
  })
  @ApiResponse({ status: 200, type: EmployeeResponseDto, description: 'Updated employee with signed photo URL' })
  @ApiResponse({ status: 413, description: 'File size exceeds 5MB limit' })
  @ApiResponse({ status: 415, description: 'Unsupported media type (only JPEG and PNG accepted)' })
  async uploadPhoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request,
  ): Promise<EmployeeResponseDto> {
    if (!file) {
      throw new BadRequestException('Profile photo file is required');
    }

    // 1. Max size 5 MB check
    if (file.size > 5242880) {
      throw new PayloadTooLargeException('File size exceeds maximum limit of 5MB');
    }

    // 2. Magic bytes check
    const detectedFormat = StorageValidator.detectMagicBytes(file.buffer);
    if (!detectedFormat) {
      throw new UnsupportedMediaTypeException('Unsupported image format. Only JPEG and PNG are allowed.');
    }

    try {
      const actingAdminId = req.user!.emp_id;
      const emp = await this.uploadPhotoUseCase.execute({
        employeeId: id,
        fileBuffer: file.buffer,
        actingAdminId,
      });
      return toEmployeeResponseDto(emp);
    } catch (err) {
      throw mapDomainErrorToHttpException(err);
    }
  }

  @Delete(':id/photo')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove employee profile photo' })
  @ApiParam({ name: 'id', type: Number, description: 'Employee ID' })
  @ApiResponse({ status: 204, description: 'Photo removed successfully' })
  async removePhoto(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ): Promise<void> {
    try {
      const actingAdminId = req.user!.emp_id;
      await this.removePhotoUseCase.execute({
        employeeId: id,
        actingAdminId,
      });
    } catch (err) {
      throw mapDomainErrorToHttpException(err);
    }
  }
}
