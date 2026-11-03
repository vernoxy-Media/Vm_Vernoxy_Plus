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
import { PerformanceFormsService } from '../../application/services/performance-forms.service';
import {
  CreatePerfFormDto,
  UpdatePerfFormDto,
} from '../dto/performance.dto';

@ApiTags('Performance - Question Master')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('performance/forms')
export class PerformanceFormsController {
  constructor(private readonly formsService: PerformanceFormsService) {}

  @Get()
  @ApiOperation({ summary: 'List review forms' })
  async listForms(@Query('cycle_id') cycleId?: string) {
    return this.formsService.listForms(cycleId ? Number(cycleId) : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get review form details' })
  async getFormById(@Param('id', ParseIntPipe) id: number) {
    return this.formsService.getFormById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new review form with 5 fixed questions' })
  async createForm(@Body() dto: CreatePerfFormDto, @Req() req: any) {
    const userId = req.user?.emp_id || req.user?.sub;
    return this.formsService.createForm(dto, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update review form (before review window starts)' })
  async updateForm(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePerfFormDto,
    @Req() req: any,
  ) {
    const userId = req.user?.emp_id || req.user?.sub;
    return this.formsService.updateForm(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete review form' })
  async deleteForm(@Param('id', ParseIntPipe) id: number) {
    return this.formsService.deleteForm(id);
  }
}

