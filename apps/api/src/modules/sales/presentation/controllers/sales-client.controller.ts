import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/public-api';
import { SalesAccessGuard } from '../guards/sales-access.guard';
import { CurrentSalesActor } from '../guards/sales-actor.decorator';
import { mapSalesErrorToHttpException } from '../sales-error.mapper';
import { ConvertToClientBodyDto, ReverseConversionBodyDto } from '../dto/sales-client.dto';
import { SalesActor } from '../../application/ports/sales-access-policy.port';
import { ClientUseCases } from '../../application/use-cases/client.use-cases';

async function run<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw mapSalesErrorToHttpException(err);
  }
}

/** Mark as Won and Convert to Client (BFD section 9). */
@ApiTags('Sales - Won and Client')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SalesAccessGuard)
@Controller('sales')
export class SalesClientController {
  constructor(private readonly clients: ClientUseCases) {}

  @Get('leads/:id/client-form')
  @ApiOperation({ summary: 'Data for the "Mark as Won and Convert to Client" pop-up: Client ID preview, Won on range and what is carried forward' })
  form(@Param('id', ParseIntPipe) id: number, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.clients.form(id, actor));
  }

  @Post('leads/:id/convert-to-client')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Mark as Won and Convert to Client in one step (Qualified leads only). The lead becomes Converted and locked, the Win note is saved, pending follow-ups are cancelled. The Admin and Lead By user are told.',
  })
  convert(@Param('id', ParseIntPipe) id: number, @Body() body: ConvertToClientBodyDto, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.clients.convert(id, body, actor));
  }

  @Post('leads/:id/reverse-conversion')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin only: reverse a conversion with a reason, while the client has no project. The lead goes back to Qualified.' })
  reverse(@Param('id', ParseIntPipe) id: number, @Body() body: ReverseConversionBodyDto, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.clients.reverse(id, body, actor));
  }

  @Get('clients/:id')
  @ApiOperation({ summary: 'Client Details: the company, its contacts, the lead it was converted from and what was carried forward' })
  get(@Param('id', ParseIntPipe) id: number) {
    return run(() => this.clients.get(id));
  }
}
