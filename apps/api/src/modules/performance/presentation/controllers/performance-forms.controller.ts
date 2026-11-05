import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { PerformanceFormsService } from '../../application/services/performance-forms.service';
import { requireEmpId } from '../../application/services/performance-access.service';
import { PerformanceAdminGuard } from '../guards/performance-admin.guard';
import { CreatePerfFormDto, QueryPerfFormsDto, UpdatePerfFormDto } from '../dto/performance.dto';

/** Question Master (Admin only). Employees get their form through the review endpoints. */
@ApiTags('Performance - Question Master')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PerformanceAdminGuard)
@Controller('performance/forms')
export class PerformanceFormsController {
  constructor(private readonly formsService: PerformanceFormsService) {}

  @Get()
  @ApiOperation({ summary: 'List forms (search; filter by cycle type, department and status)' })
  listForms(@Query() query: QueryPerfFormsDto) {
    return this.formsService.listForms(query);
  }

  @Get('fixed-questions')
  @ApiOperation({ summary: 'The 5 fixed rating questions (locked, always included)' })
  fixedQuestions() {
    return this.formsService.fixedQuestions();
  }

  @Get('coverage/:cycleId')
  @ApiOperation({ summary: 'Departments that have no form for the cycle yet' })
  coverage(@Param('cycleId', ParseIntPipe) cycleId: number) {
    return this.formsService.departmentsWithoutForm(cycleId);
  }

  @Get(':id')
  getFormById(@Param('id', ParseIntPipe) id: number) {
    return this.formsService.getFormById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Add Form (saved as Draft)' })
  createForm(@Body() dto: CreatePerfFormDto, @Req() req: any) {
    return this.formsService.createForm(dto, requireEmpId(req.user));
  }

  @Put(':id')
  updateForm(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePerfFormDto, @Req() req: any) {
    return this.formsService.updateForm(id, dto, requireEmpId(req.user));
  }

  @Patch(':id')
  patchForm(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePerfFormDto, @Req() req: any) {
    return this.formsService.updateForm(id, dto, requireEmpId(req.user));
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish (every department must have a form)' })
  publish(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.formsService.publishForm(id, requireEmpId(req.user));
  }

  @Post(':id/unpublish')
  unpublish(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.formsService.unpublishForm(id, requireEmpId(req.user));
  }

  @Delete(':id')
  deleteForm(@Param('id', ParseIntPipe) id: number) {
    return this.formsService.deleteForm(id);
  }
}
