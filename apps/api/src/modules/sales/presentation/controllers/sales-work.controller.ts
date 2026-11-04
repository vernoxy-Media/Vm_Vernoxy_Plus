import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/public-api';
import { SalesAccessGuard } from '../guards/sales-access.guard';
import { CurrentSalesActor } from '../guards/sales-actor.decorator';
import { mapSalesErrorToHttpException } from '../sales-error.mapper';
import {
  ChangeLeadByBodyDto,
  ContactBodyDto,
  ConversationBodyDto,
  HoldBodyDto,
  LostBodyDto,
  MoveStageBodyDto,
  NoteBodyDto,
  PageQueryDto,
  QualifyBodyDto,
  QuickLogBodyDto,
} from '../dto/sales-work.dto';
import { SalesActor } from '../../application/ports/sales-access-policy.port';
import { LeadActivityUseCases } from '../../application/use-cases/lead-activity.use-cases';
import { LeadStatusUseCases } from '../../application/use-cases/lead-status.use-cases';
import { ContactUseCases } from '../../application/use-cases/contact.use-cases';
import { GetLeadUseCase } from '../../application/use-cases/get-lead.use-case';

const DEFAULT_LIMIT = 20;

async function run<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw mapSalesErrorToHttpException(err);
  }
}

/** Conversations, notes, timeline and History (BFD sections 5, 7 and 8). */
@ApiTags('Sales - Lead activity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SalesAccessGuard)
@Controller('sales')
export class SalesActivityController {
  constructor(private readonly activity: LeadActivityUseCases) {}

  @Post('companies/:id/communications')
  @ApiOperation({ summary: '"+ Log Communication" on a company. Belongs to the open lead when there is one.' })
  logOnCompany(@Param('id', ParseIntPipe) id: number, @Body() body: ConversationBodyDto, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.activity.logOnCompany(id, body, actor));
  }

  @Get('companies/:id/communications')
  @ApiOperation({ summary: 'Communication history of a company, newest first' })
  companyCommunications(@Param('id', ParseIntPipe) id: number, @Query() q: PageQueryDto, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.activity.listCompanyCommunications(id, q.page ?? 1, q.limit ?? DEFAULT_LIMIT, actor));
  }

  @Get('companies/:id/history')
  @ApiOperation({ summary: 'Company History tab: every change, who and when' })
  companyHistory(@Param('id', ParseIntPipe) id: number, @Query() q: PageQueryDto) {
    return run(() => this.activity.companyHistory(id, q.page ?? 1, q.limit ?? DEFAULT_LIMIT));
  }

  @Post('leads/:id/conversations')
  @ApiOperation({ summary: '"Log Conversation" on a lead. The first one moves a New lead to Contacted. Optional next follow-up is saved with it.' })
  logOnLead(@Param('id', ParseIntPipe) id: number, @Body() body: ConversationBodyDto, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.activity.logOnLead(id, body, actor));
  }

  @Get('leads/:id/conversations')
  @ApiOperation({ summary: 'Conversations tab, newest first' })
  leadConversations(@Param('id', ParseIntPipe) id: number, @Query() q: PageQueryDto, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.activity.listLeadConversations(id, q.page ?? 1, q.limit ?? DEFAULT_LIMIT, actor));
  }

  @Patch('conversations/:id')
  @ApiOperation({ summary: 'Edit a conversation: its author for 24 hours, the Admin any time. Every edit goes to History.' })
  editConversation(@Param('id', ParseIntPipe) id: number, @Body() body: ConversationBodyDto, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.activity.editConversation(id, body, actor));
  }

  @Post('leads/:id/quick-log')
  @ApiOperation({ summary: 'Quick log: one line, saved with the exact time. A call/email/... is a conversation with the primary contact; "Note" is a General note.' })
  quickLog(@Param('id', ParseIntPipe) id: number, @Body() body: QuickLogBodyDto, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.activity.quickLog(id, body, actor));
  }

  @Get('leads/:id/notes')
  @ApiOperation({ summary: 'Notes tab: pinned first, then newest first' })
  notes(@Param('id', ParseIntPipe) id: number, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.activity.listNotes(id, actor));
  }

  @Post('leads/:id/notes')
  @ApiOperation({ summary: 'Add a General / Requirement / Budget / Readiness note' })
  addNote(@Param('id', ParseIntPipe) id: number, @Body() body: NoteBodyDto, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.activity.addNote(id, body, actor));
  }

  @Patch('notes/:id')
  @ApiOperation({ summary: 'Edit a note (author 24 hours, Admin any time) or pin / unpin it' })
  editNote(@Param('id', ParseIntPipe) id: number, @Body() body: NoteBodyDto, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.activity.editNote(id, body, actor));
  }

  @Get('leads/:id/timeline')
  @ApiOperation({ summary: 'Activity tab: pending follow-ups first, pinned notes next, then conversations, notes and status changes, newest first' })
  timeline(@Param('id', ParseIntPipe) id: number, @Query() q: PageQueryDto) {
    return run(() => this.activity.timeline(id, q.page ?? 1, q.limit ?? DEFAULT_LIMIT));
  }

  @Get('leads/:id/history')
  @ApiOperation({ summary: 'Lead History tab: every change, who and when' })
  history(@Param('id', ParseIntPipe) id: number, @Query() q: PageQueryDto) {
    return run(() => this.activity.leadHistory(id, q.page ?? 1, q.limit ?? DEFAULT_LIMIT));
  }
}

/** Qualify Lead, Put On Hold, Mark as Lost, Reopen, Change Lead By. */
@ApiTags('Sales - Lead status')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SalesAccessGuard)
@Controller('sales/leads')
export class SalesLeadStatusController {
  constructor(
    private readonly status: LeadStatusUseCases,
    private readonly getLead: GetLeadUseCase,
  ) {}

  private async withLead<T extends object>(leadId: number, result: T) {
    return { ...result, lead: await this.getLead.execute(leadId) };
  }

  @Get(':id/qualification')
  @ApiOperation({ summary: 'The Qualify popup checklist, whether "Mark as Qualified" is on, and which actions the status allows' })
  qualification(@Param('id', ParseIntPipe) id: number, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.status.qualification(id, actor));
  }

  @Post(':id/qualify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Qualify Lead (Contacted -> Qualified). 422 QUALIFICATION_INCOMPLETE lists what is missing.' })
  qualify(@Param('id', ParseIntPipe) id: number, @Body() body: QualifyBodyDto, @CurrentSalesActor() actor: SalesActor) {
    return run(async () => this.withLead(id, await this.status.qualify(id, body, actor)));
  }

  @Post(':id/hold')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Put On Hold (Contacted / Qualified). The check-back date becomes a Pending follow-up.' })
  hold(@Param('id', ParseIntPipe) id: number, @Body() body: HoldBodyDto, @CurrentSalesActor() actor: SalesActor) {
    return run(async () => this.withLead(id, await this.status.putOnHold(id, body, actor)));
  }

  @Post(':id/lost')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark as Lost (New / Contacted / Qualified). A reason is needed; pending follow-ups are cancelled.' })
  lost(@Param('id', ParseIntPipe) id: number, @Body() body: LostBodyDto, @CurrentSalesActor() actor: SalesActor) {
    return run(async () => this.withLead(id, await this.status.markLost(id, body, actor)));
  }

  @Post(':id/move')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Move a lead to any stage (New, Contacted, Qualified, On Hold, Lost) with nothing to fill in first. Only Lost needs a reason. Converted is reached with Mark as Won.',
  })
  move(@Param('id', ParseIntPipe) id: number, @Body() body: MoveStageBodyDto, @CurrentSalesActor() actor: SalesActor) {
    // Just the transition: the board already shows the card, so rebuilding the whole lead here would only slow it down.
    return run(() => this.status.moveToStage(id, body, actor));
  }

  @Post(':id/reopen')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reopen: Lost goes back to Contacted, On Hold goes back to the status it had before' })
  reopen(@Param('id', ParseIntPipe) id: number, @CurrentSalesActor() actor: SalesActor) {
    return run(async () => this.withLead(id, await this.status.reopen(id, actor)));
  }

  @Post(':id/change-lead-by')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin only: give the lead to another user (they are told)' })
  changeLeadBy(@Param('id', ParseIntPipe) id: number, @Body() body: ChangeLeadByBodyDto, @CurrentSalesActor() actor: SalesActor) {
    return run(async () => this.withLead(id, await this.status.changeLeadBy(id, body, actor)));
  }
}

/** Company contacts (BFD section 5, Part 1). */
@ApiTags('Sales - Contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SalesAccessGuard)
@Controller('sales')
export class SalesContactController {
  constructor(private readonly contacts: ContactUseCases) {}

  @Get('companies/:id/contacts')
  @ApiOperation({ summary: 'Every person at the company; the Primary tag marks the main contact' })
  list(@Param('id', ParseIntPipe) id: number) {
    return run(() => this.contacts.list(id));
  }

  @Post('companies/:id/contacts')
  @ApiOperation({ summary: '+ Add Contact. 409 DUPLICATE_CONTACT warns when the mobile / email belongs to another company; repeat with confirm_duplicate.' })
  add(@Param('id', ParseIntPipe) id: number, @Body() body: ContactBodyDto, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.contacts.add(id, body, actor.emp_id));
  }

  @Patch('contacts/:id')
  @ApiOperation({ summary: 'Edit a contact (id = company_person_id)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() body: ContactBodyDto, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.contacts.update(id, body, actor.emp_id));
  }

  @Post('contacts/:id/make-primary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Make this contact primary (only one can be)' })
  makePrimary(@Param('id', ParseIntPipe) id: number, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.contacts.makePrimary(id, actor.emp_id));
  }

  @Post('contacts/:id/left-company')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '"Left the company": kept in history, not offered in new conversations' })
  left(@Param('id', ParseIntPipe) id: number, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.contacts.markLeft(id, actor.emp_id));
  }

  @Delete('contacts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a contact that is not used anywhere; otherwise mark "Left the company"' })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentSalesActor() actor: SalesActor): Promise<void> {
    await run(() => this.contacts.remove(id, actor.emp_id));
  }
}
