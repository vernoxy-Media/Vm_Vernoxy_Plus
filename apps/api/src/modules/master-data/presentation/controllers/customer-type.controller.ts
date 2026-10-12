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
  ListCustomerTypesQueryDto,
  CreateCustomerTypeDto,
  UpdateCustomerTypeDto,
  ListCustomerTypesResponseDto,
  CustomerTypeOptionDto,
  CustomerTypeItemDto,
} from '../dto/customer-type.dto';
import { ListCustomerTypesUseCase } from '../../application/use-cases/list-customer-types.use-case';
import { GetCustomerTypeOptionsUseCase } from '../../application/use-cases/get-customer-type-options.use-case';
import { GetCustomerTypeByIdUseCase } from '../../application/use-cases/get-customer-type-by-id.use-case';
import { CreateCustomerTypeUseCase } from '../../application/use-cases/create-customer-type.use-case';
import { UpdateCustomerTypeUseCase } from '../../application/use-cases/update-customer-type.use-case';
import { DeleteCustomerTypeUseCase } from '../../application/use-cases/delete-customer-type.use-case';

@ApiTags('Master Data - Customer Types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganizationAdminGuard)
@Controller('customer-types')
export class CustomerTypeController {
  constructor(
    private readonly listCustomerTypesUseCase: ListCustomerTypesUseCase,
    private readonly getCustomerTypeOptionsUseCase: GetCustomerTypeOptionsUseCase,
    private readonly getCustomerTypeByIdUseCase: GetCustomerTypeByIdUseCase,
    private readonly createCustomerTypeUseCase: CreateCustomerTypeUseCase,
    private readonly updateCustomerTypeUseCase: UpdateCustomerTypeUseCase,
    private readonly deleteCustomerTypeUseCase: DeleteCustomerTypeUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List customer types with filters and keyset pagination' })
  @ApiResponse({ status: 200, type: ListCustomerTypesResponseDto })
  async list(@Query() query: ListCustomerTypesQueryDto): Promise<ListCustomerTypesResponseDto> {
    try {
      const result = await this.listCustomerTypesUseCase.execute(query);
      return {
        items: result.items.map((ct) => ({
          customer_type_id: ct.customer_type_id,
          name: ct.name,
          is_active: ct.is_active,
          is_default: ct.is_default,
        })),
        next_cursor: result.next_cursor,
      };
    } catch (err) {
      throw mapMasterDataErrorToHttpException(err);
    }
  }

  @Get('options')
  @ApiOperation({ summary: 'Get active customer type options' })
  @ApiResponse({ status: 200, type: [CustomerTypeOptionDto] })
  async getOptions(): Promise<CustomerTypeOptionDto[]> {
    try {
      return await this.getCustomerTypeOptionsUseCase.execute();
    } catch (err) {
      throw mapMasterDataErrorToHttpException(err);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer type details by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: CustomerTypeItemDto })
  async getById(@Param('id', ParseIntPipe) id: number): Promise<CustomerTypeItemDto> {
    try {
      const ct = await this.getCustomerTypeByIdUseCase.execute(id);
      return {
        customer_type_id: ct.customer_type_id,
        name: ct.name,
        is_active: ct.is_active,
        is_default: ct.is_default,
      };
    } catch (err) {
      throw mapMasterDataErrorToHttpException(err);
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a customer type' })
  @ApiBody({ type: CreateCustomerTypeDto })
  @ApiResponse({ status: 201, type: CustomerTypeItemDto })
  async create(
    @Body() dto: CreateCustomerTypeDto,
    @Req() req: Request,
  ): Promise<CustomerTypeItemDto> {
    try {
      const actingAdminId = req.user!.emp_id;
      const ct = await this.createCustomerTypeUseCase.execute({
        name: dto.name,
        created_by: actingAdminId,
      });
      return {
        customer_type_id: ct.customer_type_id,
        name: ct.name,
        is_active: ct.is_active,
        is_default: ct.is_default,
      };
    } catch (err) {
      throw mapMasterDataErrorToHttpException(err);
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update customer type (name, is_active, or is_default)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateCustomerTypeDto })
  @ApiResponse({ status: 200, type: CustomerTypeItemDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomerTypeDto,
    @Req() req: Request,
  ): Promise<CustomerTypeItemDto> {
    try {
      const actingAdminId = req.user!.emp_id;
      const ct = await this.updateCustomerTypeUseCase.execute({
        id,
        name: dto.name,
        is_active: dto.is_active,
        is_default: dto.is_default,
        updated_by: actingAdminId,
      });
      return {
        customer_type_id: ct.customer_type_id,
        name: ct.name,
        is_active: ct.is_active,
        is_default: ct.is_default,
      };
    } catch (err) {
      throw mapMasterDataErrorToHttpException(err);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a customer type' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204 })
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: Request): Promise<void> {
    try {
      const actingAdminId = req.user!.emp_id;
      await this.deleteCustomerTypeUseCase.execute(id, actingAdminId);
    } catch (err) {
      throw mapMasterDataErrorToHttpException(err);
    }
  }
}
