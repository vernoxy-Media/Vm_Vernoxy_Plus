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
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/public-api';
import {
  ListLeadsUseCase,
  GetLeadDetailUseCase,
  CreateLeadUseCase,
  UpdateLeadUseCase,
  UpdateLeadStageUseCase,
  ConvertLeadUseCase,
  DeleteLeadUseCase,
  GetLeadMastersUseCase,
} from '../application/use-cases/lead.use-cases';
import {
  CreateLeadDto,
  UpdateLeadDto,
  UpdateLeadStageDto,
  ListLeadsQueryDto,
} from './dto/lead.dto';

@ApiTags('Sales - Lead Pipeline')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales/leads')
export class LeadController {
  constructor(
    private readonly listLeadsUseCase: ListLeadsUseCase,
    private readonly getLeadDetailUseCase: GetLeadDetailUseCase,
    private readonly createLeadUseCase: CreateLeadUseCase,
    private readonly updateLeadUseCase: UpdateLeadUseCase,
    private readonly updateLeadStageUseCase: UpdateLeadStageUseCase,
    private readonly convertLeadUseCase: ConvertLeadUseCase,
    private readonly deleteLeadUseCase: DeleteLeadUseCase,
    private readonly getLeadMastersUseCase: GetLeadMastersUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List leads with filters, search, and pipeline stage metrics' })
  async list(@Query() query: ListLeadsQueryDto) {
    return await this.listLeadsUseCase.execute(query);
  }

  @Get('masters')
  @ApiOperation({ summary: 'Get all sales lookup masters, industries, and sales users' })
  async getMasters() {
    return await this.getLeadMastersUseCase.execute();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single lead details by ID' })
  @ApiParam({ name: 'id', type: Number })
  async getById(@Param('id', ParseIntPipe) id: number) {
    return await this.getLeadDetailUseCase.execute(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new lead with all sales fields' })
  @ApiBody({ type: CreateLeadDto })
  async create(@Body() dto: CreateLeadDto, @Req() req: Request) {
    const actingEmpId = req.user?.emp_id || 1;
    return await this.createLeadUseCase.execute(dto, actingEmpId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update lead details' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateLeadDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLeadDto,
    @Req() req: Request,
  ) {
    const actingEmpId = req.user?.emp_id || 1;
    return await this.updateLeadUseCase.execute(id, dto, actingEmpId);
  }

  @Patch(':id/stage')
  @ApiOperation({ summary: 'Update lead pipeline stage or status (Drag and Drop)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateLeadStageDto })
  async updateStage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLeadStageDto,
    @Req() req: Request,
  ) {
    const actingEmpId = req.user?.emp_id || 1;
    return await this.updateLeadStageUseCase.execute(id, dto, actingEmpId);
  }

  @Post(':id/convert')
  @ApiOperation({ summary: 'Convert qualified lead to Company and Client Contact' })
  @ApiParam({ name: 'id', type: Number })
  @HttpCode(HttpStatus.OK)
  async convert(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const actingEmpId = req.user?.emp_id || 1;
    return await this.convertLeadUseCase.execute(id, actingEmpId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete lead' })
  @ApiParam({ name: 'id', type: Number })
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const actingEmpId = req.user?.emp_id || 1;
    return await this.deleteLeadUseCase.execute(id, actingEmpId);
  }
}
