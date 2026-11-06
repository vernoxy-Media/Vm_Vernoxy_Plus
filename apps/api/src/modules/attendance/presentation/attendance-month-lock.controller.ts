import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { AttendanceMonthLockService } from '../application/services/attendance-month-lock.service';
import { AttendanceAdminGuard } from './guards/attendance-admin.guard';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attendance/month-locks')
export class AttendanceMonthLockController {
  constructor(private readonly locks: AttendanceMonthLockService) {}

  @Get()
  @ApiOperation({ summary: 'Lock status of every month of a year' })
  list(@Query('year') year?: string) {
    const y = Number(year) || new Date().getFullYear();
    return this.locks.listYear(y);
  }

  @Get(':year/:month')
  status(@Param('year', ParseIntPipe) year: number, @Param('month', ParseIntPipe) month: number) {
    return this.locks.status(year, month);
  }

  @Post(':year/:month/lock')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AttendanceAdminGuard)
  @ApiOperation({ summary: 'Lock a month of attendance (Admin)' })
  lock(@Req() req: Request, @Param('year', ParseIntPipe) year: number, @Param('month', ParseIntPipe) month: number) {
    return this.locks.lock(year, month, req.user!.emp_id, 'MANUAL');
  }

  @Post(':year/:month/unlock')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AttendanceAdminGuard)
  @ApiOperation({ summary: 'Unlock a month of attendance (Admin, reason required)' })
  unlock(
    @Req() req: Request,
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
    @Body('reason') reason: string,
  ) {
    return this.locks.unlock(year, month, req.user!.emp_id, reason);
  }
}
