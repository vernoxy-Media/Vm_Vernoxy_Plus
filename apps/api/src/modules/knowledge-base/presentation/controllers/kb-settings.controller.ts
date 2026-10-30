import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { KbSettingsService } from '../../application/services/kb-settings.service';
import { CreateKbCategoryDto, UpdateKbCategoryDto } from '../dto/kb-settings.dto';

@ApiTags('Knowledge Base - Settings & Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kb/settings')
export class KbSettingsController {
  constructor(private readonly kbSettingsService: KbSettingsService) {}

  @Get('categories')
  @ApiOperation({ summary: 'List knowledge base categories' })
  @ApiQuery({ name: 'space', required: false, enum: ['INTERNAL', 'CLIENT'] })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async listCategories(
    @Query('space') space?: 'INTERNAL' | 'CLIENT',
    @Query('includeInactive') includeInactive?: string,
  ) {
    const showInactive = includeInactive === 'true' || includeInactive === '1';
    return this.kbSettingsService.listCategories(space, showInactive);
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Get a knowledge base category by ID' })
  async getCategoryById(@Param('id', ParseIntPipe) id: number) {
    return this.kbSettingsService.getCategoryById(id);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a new knowledge base category' })
  async createCategory(@Body() dto: CreateKbCategoryDto, @Req() req: any) {
    const userId = req.user?.emp_id || req.user?.sub;
    return this.kbSettingsService.createCategory(dto, userId);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update an existing knowledge base category' })
  async updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateKbCategoryDto,
    @Req() req: any,
  ) {
    const userId = req.user?.emp_id || req.user?.sub;
    return this.kbSettingsService.updateCategory(id, dto, userId);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete a knowledge base category (empty only)' })
  async deleteCategory(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user?.emp_id || req.user?.sub;
    return this.kbSettingsService.deleteCategory(id, userId);
  }
}
