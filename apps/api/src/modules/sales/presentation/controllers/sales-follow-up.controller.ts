import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/public-api';
import { SalesAccessGuard } from '../guards/sales-access.guard';
import { CurrentSalesActor } from '../guards/sales-actor.decorator';
import { mapSalesErrorToHttpException } from '../sales-error.mapper';
import {
  CancelBodyDto,
  CompleteFollowUpBodyDto,
  EditFollowUpBodyDto,
  ListFollowUpsQueryDto,
  RescheduleBodyDto,
  ScheduleFollowUpBodyDto,
  ScheduleOnLeadBodyDto,
} from '../dto/sales-follow-up.dto';
import { SalesActor } from '../../application/ports/sales-access-policy.port';
import { FollowUpUseCases } from '../../application/use-cases/follow-up.use-cases';

async function run<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw mapSalesErrorToHttpException(err);
  }
}

const who = (v: string | undefined): 'me' | 'all' | number | undefined =>
  v === undefined ? undefined : /^\d+$/.test(v) ? Number(v) : (v as 'me' | 'all');

/** The Follow-ups page and the follow-up pop-ups (BFD section 7, Parts 3 to 6). */
@ApiTags('Sales - Follow-ups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SalesAccessGuard)
@Controller('sales')
export class SalesFollowUpController {
  constructor(private readonly followUps: FollowUpUseCases) {}

  @Get('follow-ups')
  @ApiOperation({
    summary:
      'Follow-ups page. Tabs: today, upcoming, overdue, completed, cancelled (each tab count is returned). A Sales user sees follow-ups assigned to them or on their leads; the Admin sees all.',
  })
  list(@Query() q: ListFollowUpsQueryDto, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.followUps.list({ ...q, assigned_to: who(q.assigned_to), lead_by: who(q.lead_by) }, actor));
  }

  @Post('follow-ups')
  @ApiOperation({ summary: '+ Schedule Follow-up: for a lead, or for a company that is not yet a lead' })
  schedule(@Body() body: ScheduleFollowUpBodyDto, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.followUps.schedule(body, actor));
  }

  @Get('follow-ups/:id')
  @ApiOperation({ summary: 'One follow-up: the strip of the Complete pop-up, with the buttons the user may press' })
  get(@Param('id', ParseIntPipe) id: number, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.followUps.get(id, actor));
  }

  @Patch('follow-ups/:id')
  @ApiOperation({ summary: 'Edit purpose, contact or Assigned to while Pending or Overdue (the date changes only through Reschedule)' })
  edit(@Param('id', ParseIntPipe) id: number, @Body() body: EditFollowUpBodyDto, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.followUps.edit(id, body, actor));
  }

  @Post('follow-ups/:id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Complete: saves what happened as a conversation, marks it Completed and runs the next step (schedule / qualify / hold / lost / none) - all or nothing.',
  })
  complete(@Param('id', ParseIntPipe) id: number, @Body() body: CompleteFollowUpBodyDto, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.followUps.complete(id, body, actor));
  }

  @Post('follow-ups/:id/reschedule')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reschedule (Pending or Overdue): new date and time plus a reason. The third time the Admin is told.' })
  reschedule(@Param('id', ParseIntPipe) id: number, @Body() body: RescheduleBodyDto, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.followUps.reschedule(id, body, actor));
  }

  @Post('follow-ups/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel (Pending or Overdue): a reason is needed' })
  cancel(@Param('id', ParseIntPipe) id: number, @Body() body: CancelBodyDto, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.followUps.cancel(id, body, actor));
  }

  @Get('leads/:id/follow-ups')
  @ApiOperation({ summary: 'Follow-ups tab of Lead Details: open ones first, then the finished ones' })
  forLead(@Param('id', ParseIntPipe) id: number, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.followUps.forLead(id, actor));
  }

  @Post('leads/:id/follow-ups')
  @ApiOperation({ summary: 'Quick log "Follow-up" on Lead Details: date, time and type, saved as a Pending follow-up' })
  scheduleOnLead(@Param('id', ParseIntPipe) id: number, @Body() body: ScheduleOnLeadBodyDto, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.followUps.schedule({ ...body, type: body.type ?? 'Call', lead_id: id }, actor));
  }
}
