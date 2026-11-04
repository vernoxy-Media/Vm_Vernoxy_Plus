import {
  ArgumentsHost,
  BadRequestException,
  Body,
  Catch,
  Controller,
  Delete,
  ExceptionFilter,
  ForbiddenException,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
  ConflictException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../../auth/public-api';
import { MessengerService } from '../application/messenger.service';
import { MESSENGER_LIMITS, MessengerError } from '../domain/messenger.types';
import { MESSENGER_FILE_STORE, MessengerFileStorePort } from '../domain/ports/messenger-file-store.port';
import {
  AddMembersDto,
  CreateGroupDto,
  DeleteMessageDto,
  EditMessageDto,
  ForwardDto,
  OpenDirectDto,
  PrefsDto,
  ReactDto,
  SendMessageDto,
  SetAdminDto,
  StatusDto,
  UpdateGroupDto,
} from './messenger.dto';

@Catch(MessengerError)
class MessengerErrorFilter implements ExceptionFilter {
  catch(error: MessengerError, host: ArgumentsHost) {
    const map = {
      not_found: NotFoundException,
      forbidden: ForbiddenException,
      invalid: BadRequestException,
      conflict: ConflictException,
    } as const;
    const exception: HttpException = new map[error.code](error.message);
    const res = host.switchToHttp().getResponse<Response>();
    res.status(exception.getStatus()).json({ statusCode: exception.getStatus(), message: error.message });
  }
}

const me = (req: Request): number => req.user!.emp_id;

@ApiTags('Messenger')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseFilters(MessengerErrorFilter)
@Controller('messenger')
export class MessengerController {
  constructor(
    @Inject(MessengerService) private readonly service: MessengerService,
    @Inject(MESSENGER_FILE_STORE) private readonly files: MessengerFileStorePort,
  ) {}

  // -- Directory, presence, counters
  @Get('directory')
  directory(@Req() req: Request, @Query('q') q = '') {
    return this.service.directory(me(req), q);
  }

  @Get('unread-count')
  async unread(@Req() req: Request) {
    return { unread_count: await this.service.unreadCount(me(req)) };
  }

  @Get('presence')
  presence(@Query('ids') ids = '') {
    const list = ids.split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0);
    return this.service.presence(list);
  }

  @Put('me/status')
  async setStatus(@Req() req: Request, @Body() dto: StatusDto) {
    await this.service.setStatus(me(req), dto.status, dto.status_text ?? null, dto.minutes ?? null);
    return { success: true };
  }

  @Get('search')
  search(@Req() req: Request, @Query('q') q = '') {
    return this.service.search(me(req), q);
  }

  @Get('starred')
  starred(@Req() req: Request) {
    return this.service.starred(me(req));
  }

  // -- Conversations
  @Get('conversations')
  list(@Req() req: Request) {
    return this.service.listConversations(me(req));
  }

  @Post('conversations/direct')
  @HttpCode(HttpStatus.OK)
  openDirect(@Req() req: Request, @Body() dto: OpenDirectDto) {
    return this.service.openDirect(me(req), dto.peer_id);
  }

  @Post('conversations/group')
  createGroup(@Req() req: Request, @Body() dto: CreateGroupDto) {
    return this.service.createGroup(me(req), dto);
  }

  @Get('resolve/:ref')
  resolve(@Req() req: Request, @Param('ref') ref: string) {
    return this.service.resolveConversation(me(req), ref);
  }

  @Get('conversations/:id')
  get(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.service.getConversation(me(req), id);
  }

  @Patch('conversations/:id')
  async update(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGroupDto) {
    await this.service.updateGroup(me(req), id, dto);
    return { success: true };
  }

  @Patch('conversations/:id/prefs')
  async prefs(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() dto: PrefsDto) {
    await this.service.setPrefs(me(req), id, dto);
    return { success: true };
  }

  @Post('conversations/:id/members')
  @HttpCode(HttpStatus.OK)
  async addMembers(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() dto: AddMembersDto) {
    await this.service.addMembers(me(req), id, dto.member_ids);
    return { success: true };
  }

  @Delete('conversations/:id/members/:empId')
  async removeMember(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Param('empId', ParseIntPipe) empId: number,
  ) {
    await this.service.removeMember(me(req), id, empId);
    return { success: true };
  }

  @Put('conversations/:id/members/:empId/admin')
  async setAdmin(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Param('empId', ParseIntPipe) empId: number,
    @Body() dto: SetAdminDto,
  ) {
    await this.service.setAdmin(me(req), id, empId, dto.is_admin);
    return { success: true };
  }

  @Post('conversations/:id/leave')
  @HttpCode(HttpStatus.OK)
  async leave(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    await this.service.leave(me(req), id);
    return { success: true };
  }

  @Post('conversations/:id/close')
  @HttpCode(HttpStatus.OK)
  async close(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    await this.service.closeGroup(me(req), id);
    return { success: true };
  }

  @Post('conversations/:id/read')
  @HttpCode(HttpStatus.OK)
  async read(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    await this.service.markRead(me(req), id);
    return { success: true };
  }

  @Get('conversations/:id/receipts')
  receipts(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.service.receipts(me(req), id);
  }

  @Post('conversations/:id/typing')
  @HttpCode(HttpStatus.OK)
  async typing(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    await this.service.typing(me(req), id);
    return { success: true };
  }

  // -- Messages
  @Get('conversations/:id/messages')
  messages(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Query('before') before?: string,
    @Query('q') q?: string,
    @Query('files') files?: string,
  ) {
    return this.service.listMessages(me(req), id, {
      before: before ? Number(before) || undefined : undefined,
      query: q,
      onlyFiles: files === '1',
    });
  }

  @Post('conversations/:id/messages')
  send(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() dto: SendMessageDto) {
    return this.service.send(me(req), id, dto);
  }

  @Post('conversations/:id/files')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MESSENGER_LIMITS.maxFileBytes } }))
  async sendFile(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('caption') caption?: string,
    @Body('reply_to_id') replyTo?: string,
  ) {
    if (!file) throw new BadRequestException('File is required.');
    const name = Buffer.from(file.originalname, 'latin1').toString('utf8');
    // Rules are checked before anything is written to disk.
    const meta = { name, path: '', size: file.size, mime: file.mimetype || 'application/octet-stream' };
    await this.service.sendFile(me(req), id, meta, { caption, reply_to_id: replyTo ? Number(replyTo) : undefined }, async () => {
      return this.files.save(id, name, file.buffer);
    });
    return { success: true };
  }

  @Get('messages/:id/file')
  async file(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Query('download') download: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const meta = await this.service.fileOf(me(req), id);
    const stream = this.files.open(meta.path);
    if (!stream) throw new NotFoundException('File not available.');
    res.set({
      'Content-Type': meta.mime,
      'Content-Disposition': `${download === '1' ? 'attachment' : 'inline'}; filename="${encodeURIComponent(meta.name)}"`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=300',
    });
    return new StreamableFile(stream);
  }

  @Patch('messages/:id')
  edit(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() dto: EditMessageDto) {
    return this.service.edit(me(req), id, dto.body);
  }

  @Post('messages/:id/delete')
  @HttpCode(HttpStatus.OK)
  async remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() dto: DeleteMessageDto) {
    await this.service.remove(me(req), id, dto.mode);
    return { success: true };
  }

  @Post('messages/:id/react')
  @HttpCode(HttpStatus.OK)
  async react(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() dto: ReactDto) {
    await this.service.react(me(req), id, dto.emoji);
    return { success: true };
  }

  @Post('messages/:id/star')
  @HttpCode(HttpStatus.OK)
  async star(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return { starred: await this.service.star(me(req), id) };
  }

  @Post('messages/:id/pin')
  @HttpCode(HttpStatus.OK)
  async pin(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return { pinned: await this.service.pin(me(req), id) };
  }

  @Get('messages/:id/info')
  info(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.service.messageInfo(me(req), id);
  }

  @Post('forward')
  @HttpCode(HttpStatus.OK)
  async forward(@Req() req: Request, @Body() dto: ForwardDto) {
    await this.service.forward(me(req), dto.message_ids, dto.conversation_ids, dto.comment);
    return { success: true };
  }
}
