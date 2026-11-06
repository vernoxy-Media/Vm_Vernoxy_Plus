import { Body, Controller, ForbiddenException, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsBoolean, IsEmail, IsInt, IsString, Length, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/public-api';
import { ClientUsersService } from '../application/client-users.service';
import { ClientProjectsService } from '../application/client-projects.service';
import { EmployeeLoginsService } from '../application/employee-logins.service';
import { ClientAuthGuard } from './client-auth.guard';

export class ClientLoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(1) @MaxLength(128) password!: string;
}
export class ClientChangePasswordDto {
  @IsString() @MaxLength(128) current_password!: string;
  @IsString() @MaxLength(128) new_password!: string;
}
export class ClientForgotDto {
  @IsEmail() email!: string;
}
export class ClientResetDto {
  @IsEmail() email!: string;
  @IsString() @Length(6, 6) code!: string;
  @IsString() @MaxLength(128) new_password!: string;
}
export class CreateClientLoginDto {
  @Type(() => Number) @IsInt() client_id!: number;
  @IsString() @MinLength(1) @MaxLength(150) name!: string;
  @IsEmail() email!: string;
}
export class SetClientLoginActiveDto {
  @IsBoolean() is_active!: boolean;
}

/** What a client does: sign in, look after its password, see its projects. */
@ApiTags('Client portal')
@Controller('client-portal')
export class ClientPortalController {
  constructor(
    private readonly users: ClientUsersService,
    private readonly projects: ClientProjectsService,
  ) {}

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Client sign in' })
  login(@Body() dto: ClientLoginDto) {
    return this.users.login(dto.email, dto.password);
  }

  @Post('password/forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Email a 6-digit code to reset the password (always answers the same)' })
  async forgot(@Body() dto: ClientForgotDto) {
    await this.users.forgotPassword(dto.email);
    return { message: 'If this email has a login, a code has been sent to it.' };
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Set a new password with the emailed code' })
  async reset(@Body() dto: ClientResetDto) {
    await this.users.resetPasswordWithCode(dto.email, dto.code, dto.new_password);
  }

  @Get('me')
  @UseGuards(ClientAuthGuard)
  @ApiBearerAuth()
  me(@Req() req: Request) {
    return this.users.profile(req.clientUser!.client_user_id);
  }

  @Post('password/change')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ClientAuthGuard)
  @ApiBearerAuth()
  async change(@Req() req: Request, @Body() dto: ClientChangePasswordDto) {
    await this.users.changePassword(req.clientUser!.client_user_id, dto.current_password, dto.new_password);
  }

  @Get('projects')
  @UseGuards(ClientAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'The projects of this client, with progress' })
  list(@Req() req: Request) {
    return this.projects.list(req.clientUser!.client_id);
  }

  @Get('projects/:id')
  @UseGuards(ClientAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'One project of this client: stages and sprints' })
  detail(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.projects.detail(req.clientUser!.client_id, id);
  }
}

/** What an Admin does about client logins. The temporary password is shown once, in the answer of create / reset. */
@ApiTags('Client portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/client-logins')
export class ClientLoginsAdminController {
  constructor(private readonly users: ClientUsersService) {}

  @Get()
  async list(@Req() req: Request, @Query('client_id') clientId?: string) {
    await this.admin(req);
    return this.users.list(clientId ? Number(clientId) || undefined : undefined);
  }

  @Post()
  async create(@Req() req: Request, @Body() dto: CreateClientLoginDto) {
    await this.admin(req);
    return this.users.create(req.user!.emp_id, dto);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  async reset(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    await this.admin(req);
    return this.users.resetPassword(req.user!.emp_id, id);
  }

  @Patch(':id')
  async setActive(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() dto: SetClientLoginActiveDto) {
    await this.admin(req);
    return this.users.setActive(req.user!.emp_id, id, dto.is_active);
  }

  private async admin(req: Request) {
    if (!(await this.users.isAdmin(req.user!.emp_id))) throw new ForbiddenException('Only an Admin can manage client logins.');
  }
}

/** An Admin resets an employee's password; the new temporary password is shown once. */
@ApiTags('Client portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/employee-logins')
export class EmployeeLoginsAdminController {
  constructor(
    private readonly users: ClientUsersService,
    private readonly employees: EmployeeLoginsService,
  ) {}

  @Post(':empId/reset-password')
  @HttpCode(HttpStatus.OK)
  async reset(@Req() req: Request, @Param('empId', ParseIntPipe) empId: number) {
    if (!(await this.users.isAdmin(req.user!.emp_id))) throw new ForbiddenException('Only an Admin can reset a password.');
    return this.employees.resetPassword(req.user!.emp_id, empId);
  }
}
