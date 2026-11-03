import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { PerformanceCyclesService } from '../../application/services/performance-cycles.service';
import {
  CreatePerfCycleDto,
  QueryPerfCyclesDto,
  UpdatePerfCycleDto,
} from '../dto/performance.dto';

@ApiTags('Performance - Cycle Master')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('performance/cycles')
export class PerformanceCyclesController {
  constructor(private readonly cyclesService: PerformanceCyclesService) {}

  @Get()
  @ApiOperation({ summary: 'List all evaluation cycles' })
  async listCycles(@Query() query: QueryPerfCyclesDto) {
    return this.cyclesService.listCycles(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single cycle details' })
  async getCycleById(@Param('id', ParseIntPipe) id: number) {
    return this.cyclesService.getCycleById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new evaluation cycle (Admin only)' })
  async createCycle(@Body() dto: CreatePerfCycleDto, @Req() req: any) {
    const userId = req.user?.emp_id || req.user?.sub;
    return this.cyclesService.createCycle(dto, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update evaluation cycle' })
  async updateCycle(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePerfCycleDto,
    @Req() req: any,
  ) {
    const userId = req.user?.emp_id || req.user?.sub;
    return this.cyclesService.updateCycle(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete cycle (if no submitted reviews)' })
  async deleteCycle(@Param('id', ParseIntPipe) id: number) {
    return this.cyclesService.deleteCycle(id);
  }
}

