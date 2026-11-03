import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/public-api';
import { SalesAccessGuard } from '../guards/sales-access.guard';
import { CurrentSalesActor } from '../guards/sales-actor.decorator';
import { mapSalesErrorToHttpException } from '../sales-error.mapper';
import {
  CreateSalesCompanyBodyDto,
  DuplicateCheckQueryDto,
  ListSalesCompaniesQueryDto,
  UpdateSalesCompanyBodyDto,
} from '../dto/sales-company.dto';
import { SalesActor } from '../../application/ports/sales-access-policy.port';
import { CreateSalesCompanyUseCase } from '../../application/use-cases/create-sales-company.use-case';
import { UpdateSalesCompanyUseCase } from '../../application/use-cases/update-sales-company.use-case';
import { ListSalesCompaniesUseCase } from '../../application/use-cases/list-sales-companies.use-case';
import { GetSalesCompanyUseCase } from '../../application/use-cases/get-sales-company.use-case';
import { CheckSalesCompanyDuplicatesUseCase } from '../../application/use-cases/check-sales-company-duplicates.use-case';
import { DeleteSalesCompanyUseCase } from '../../application/use-cases/delete-sales-company.use-case';
import { GetSalesMastersUseCase } from '../../application/use-cases/get-sales-masters.use-case';

/** Company Database (BFD sections 3 and 4). Open to the Sales team and Admin. */
@ApiTags('Sales - Company Database')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SalesAccessGuard)
@Controller('sales/companies')
export class SalesCompanyController {
  constructor(
    private readonly listUseCase: ListSalesCompaniesUseCase,
    private readonly getUseCase: GetSalesCompanyUseCase,
    private readonly createUseCase: CreateSalesCompanyUseCase,
    private readonly updateUseCase: UpdateSalesCompanyUseCase,
    private readonly deleteUseCase: DeleteSalesCompanyUseCase,
    private readonly duplicatesUseCase: CheckSalesCompanyDuplicatesUseCase,
    private readonly mastersUseCase: GetSalesMastersUseCase,
  ) {}

  private async run<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      throw mapSalesErrorToHttpException(err);
    }
  }

  @Get()
  @ApiOperation({ summary: 'List companies: filters, search, sort, 10 per page, and the four counters' })
  list(@Query() query: ListSalesCompaniesQueryDto) {
    return this.run(() => this.listUseCase.execute(query));
  }

  @Get('masters')
  @ApiOperation({ summary: 'Values for the dropdowns of the Company forms and filters' })
  masters() {
    return this.run(() => this.mastersUseCase.execute());
  }

  @Get('duplicate-check')
  @ApiOperation({ summary: 'Same name + city, or same mobile / email as a contact of another company' })
  duplicateCheck(@Query() query: DuplicateCheckQueryDto) {
    return this.run(() => this.duplicatesUseCase.execute(query));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Company Details: all fields, contacts and the lead / client tag' })
  get(@Param('id', ParseIntPipe) id: number) {
    return this.run(() => this.getUseCase.execute(id));
  }

  @Post()
  @ApiOperation({
    summary: 'Add Company. 409 DUPLICATE_COMPANY is a warning: repeat with confirm_duplicate=true to save anyway.',
  })
  create(@Body() body: CreateSalesCompanyBodyDto, @CurrentSalesActor() actor: SalesActor) {
    return this.run(() =>
      this.createUseCase.execute({
        company: { ...body.company },
        contact: body.contact ? { ...body.contact } : undefined,
        confirm_duplicate: body.confirm_duplicate,
        actor_emp_id: actor.emp_id,
      }),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a company (only the keys that are sent change)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateSalesCompanyBodyDto,
    @CurrentSalesActor() actor: SalesActor,
  ) {
    return this.run(() =>
      this.updateUseCase.execute({
        company_id: id,
        company: body.company ? { ...body.company } : undefined,
        contact: body.contact ? { ...body.contact } : undefined,
        confirm_duplicate: body.confirm_duplicate,
        actor_emp_id: actor.emp_id,
      }),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Admin only, and only when the company has no lead, no client and no communication' })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentSalesActor() actor: SalesActor): Promise<void> {
    await this.run(() => this.deleteUseCase.execute(id, actor));
  }
}
