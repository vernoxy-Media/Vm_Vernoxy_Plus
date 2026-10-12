import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/public-api';
import { CompanyAdminGuard } from '../guards/company-admin.guard';
import { mapMasterDataErrorToHttpException } from '../master-data-error.mapper';
import { LookupOptionsQueryDto, LookupOptionDto } from '../dto/lookup.dto';
import { GetLookupOptionsUseCase } from '../../application/use-cases/get-lookup-options.use-case';

@ApiTags('Master Data - Lookups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CompanyAdminGuard)
@Controller('lookups')
export class LookupController {
  constructor(
    private readonly getLookupOptionsUseCase: GetLookupOptionsUseCase,
  ) {}

  @Get('options')
  @ApiOperation({ summary: 'Get active lookup options by type (e.g. person_department)' })
  @ApiResponse({ status: 200, type: [LookupOptionDto] })
  async getOptions(@Query() query: LookupOptionsQueryDto): Promise<LookupOptionDto[]> {
    try {
      return await this.getLookupOptionsUseCase.execute(query.type);
    } catch (err) {
      throw mapMasterDataErrorToHttpException(err);
    }
  }
}
