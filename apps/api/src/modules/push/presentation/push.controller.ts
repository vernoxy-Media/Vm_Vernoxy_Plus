import { BadRequestException, Body, Controller, Delete, Get, Headers, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/public-api';
import { PushService } from '../application/push.service';
import { isAllowedPushEndpoint } from '../domain/push-rules';

export class PushSubscriptionDto {
  @ApiProperty({ description: "The address of the browser's push service" })
  @IsString() @IsNotEmpty() @MaxLength(1000)
  endpoint!: string;

  @ApiProperty({ description: "The browser's public key (base64url)" })
  @IsString() @IsNotEmpty() @MaxLength(200)
  p256dh!: string;

  @ApiProperty({ description: "The browser's auth secret (base64url)" })
  @IsString() @IsNotEmpty() @MaxLength(100)
  auth!: string;
}

export class PushEndpointDto {
  @ApiProperty()
  @IsString() @IsNotEmpty() @MaxLength(1000)
  endpoint!: string;
}

@ApiTags('Push')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Get('config')
  @ApiOperation({ summary: 'Whether desktop notifications are on, and the key a browser needs to subscribe' })
  config() {
    return this.push.config();
  }

  @Post('subscriptions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remember this browser, so it gets notifications when the app is not open' })
  async subscribe(@Req() req: Request, @Body() dto: PushSubscriptionDto, @Headers('user-agent') userAgent?: string): Promise<void> {
    if (!this.push.isEnabled()) throw new BadRequestException('Desktop notifications are not switched on for this server.');
    if (!isAllowedPushEndpoint(dto.endpoint)) throw new BadRequestException('That is not the push service of a browser.');
    await this.push.subscribe(req.user!.emp_id, dto, userAgent);
  }

  @Delete('subscriptions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Stop sending notifications to this browser' })
  async unsubscribe(@Req() req: Request, @Body() dto: PushEndpointDto): Promise<void> {
    await this.push.unsubscribe(req.user!.emp_id, dto.endpoint);
  }
}
