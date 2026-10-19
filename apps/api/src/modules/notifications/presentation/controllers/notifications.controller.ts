import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../../auth/public-api';
import { GetNotificationsUseCase } from '../../application/use-cases/get-notifications.use-case';
import { GetUnreadCountUseCase } from '../../application/use-cases/get-unread-count.use-case';
import { MarkReadUseCase } from '../../application/use-cases/mark-read.use-case';
import { MarkAllReadUseCase } from '../../application/use-cases/mark-all-read.use-case';
import {
  NotificationResponseDto,
  NotificationsQueryDto,
  UnreadCountResponseDto,
  MarkReadResponseDto,
  MarkAllReadResponseDto,
} from '../dto/notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly getNotificationsUseCase: GetNotificationsUseCase,
    private readonly getUnreadCountUseCase: GetUnreadCountUseCase,
    private readonly markReadUseCase: MarkReadUseCase,
    private readonly markAllReadUseCase: MarkAllReadUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get current user notifications' })
  @ApiResponse({ status: 200, type: [NotificationResponseDto] })
  async getNotifications(
    @Req() req: Request,
    @Query() query: NotificationsQueryDto,
  ): Promise<NotificationResponseDto[]> {
    const empId = req.user!.emp_id;
    return this.getNotificationsUseCase.execute({
      recipientId: empId,
      limit: query.limit,
      offset: query.offset,
      unreadOnly: query.unread_only,
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, type: UnreadCountResponseDto })
  async getUnreadCount(@Req() req: Request): Promise<UnreadCountResponseDto> {
    const empId = req.user!.emp_id;
    const count = await this.getUnreadCountUseCase.execute(empId);
    return { unread_count: count };
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200, type: MarkReadResponseDto })
  async markRead(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MarkReadResponseDto> {
    const empId = req.user!.emp_id;
    const success = await this.markReadUseCase.execute(id, empId);
    return { success };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, type: MarkAllReadResponseDto })
  async markAllRead(@Req() req: Request): Promise<MarkAllReadResponseDto> {
    const empId = req.user!.emp_id;
    const marked = await this.markAllReadUseCase.execute(empId);
    return { marked_count: marked };
  }
}
