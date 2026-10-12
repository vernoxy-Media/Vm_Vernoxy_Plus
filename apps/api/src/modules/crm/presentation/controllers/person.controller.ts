import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/public-api';
import { CompanyAdminGuard } from '../guards/company-admin.guard';
import { mapCrmErrorToHttpException } from '../crm-error.mapper';
import { PersonLookupQueryDto, PersonLookupMatchDto } from '../dto/person.dto';
import { LookupPersonsUseCase } from '../../application/use-cases/lookup-persons.use-case';

@ApiTags('CRM - Persons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CompanyAdminGuard)
@Controller('persons')
export class PersonController {
  constructor(
    private readonly lookupPersonsUseCase: LookupPersonsUseCase,
  ) {}

  @Get('lookup')
  @ApiOperation({ summary: 'Lookup persons by email or mobile to link existing person' })
  @ApiResponse({ status: 200, type: [PersonLookupMatchDto] })
  async lookup(@Query() query: PersonLookupQueryDto): Promise<PersonLookupMatchDto[]> {
    try {
      return await this.lookupPersonsUseCase.execute(query);
    } catch (err) {
      throw mapCrmErrorToHttpException(err);
    }
  }
}
