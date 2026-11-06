import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { PerformanceCyclesService } from '../../application/services/performance-cycles.service';
import { requireEmpId } from '../../application/services/performance-access.service';
import { PerformanceAdminGuard } from '../guards/performance-admin.guard';
import { CreatePerfCycleDto, CyclePreviewQueryDto, QueryPerfCyclesDto, UpdatePerfCycleDto } from '../dto/performance.dto';

/** Cycle Master. Everyone may read cycles (to pick one); only Admin creates or changes them. */
@ApiTags('Performance - Cycle Master')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('performance/cycles')
export class PerformanceCyclesController {
  constructor(private readonly cyclesService: PerformanceCyclesService) {}

  @Get()
  @ApiOperation({ summary: 'List cycles (search by name; filter by type, year and status)' })
  listCycles(@Query() query: QueryPerfCyclesDto) {
    return this.cyclesService.listCycles(query);
  }

  @Get('preview')
  @UseGuards(PerformanceAdminGuard)
  @ApiOperation({ summary: 'Dates, review window and name the system will fill (Screen 2)' })
  preview(@Query() q: CyclePreviewQueryDto) {
    return this.cyclesService.preview(q.cycle_type, q.year, q.quarter, q.month);
  }

  @Get(':id')
  getCycleById(@Param('id', ParseIntPipe) id: number) {
    return this.cyclesService.getCycleById(id);
  }

  @Post()
  @UseGuards(PerformanceAdminGuard)
  @ApiOperation({ summary: 'Add Cycle (Admin)' })
  createCycle(@Body() dto: CreatePerfCycleDto, @Req() req: any) {
    return this.cyclesService.createCycle(dto, requireEmpId(req.user));
  }

  @Put(':id')
  @UseGuards(PerformanceAdminGuard)
  @ApiOperation({ summary: 'Edit cycle (Admin, only before the review window opens)' })
  updateCycle(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePerfCycleDto, @Req() req: any) {
    return this.cyclesService.updateCycle(id, dto, requireEmpId(req.user));
  }

  @Patch(':id')
  @UseGuards(PerformanceAdminGuard)
  patchCycle(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePerfCycleDto, @Req() req: any) {
    return this.cyclesService.updateCycle(id, dto, requireEmpId(req.user));
  }

  @Delete(':id')
  @UseGuards(PerformanceAdminGuard)
  @ApiOperation({ summary: 'Delete cycle (Admin, before the window opens and with no reviews)' })
  deleteCycle(@Param('id', ParseIntPipe) id: number) {
    return this.cyclesService.deleteCycle(id);
  }
}
