import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  Headers,
  HttpCode,
  HttpStatus,
  HttpException,
  UseGuards,
  Inject,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../../application/services/auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import {
  LoginDto,
  LoginResponseDto,
  VerifyLoginDto,
  VerifyLoginResponseDto,
  ResendOtpDto,
  RefreshResponseDto,
  MeResponseDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ForgotPasswordResponseDto,
  ResetPasswordDto,
} from '../dto/auth.dto';
import {
  AuthException,
  UnauthorizedAuthException,
  BadRequestAuthException,
  TooManyRequestsAuthException,
} from '../../application/errors/auth.errors';

function mapAuthErrorToHttp(err: any): never {
  if (err instanceof UnauthorizedAuthException) {
    throw new UnauthorizedException(err.message);
  }
  if (err instanceof BadRequestAuthException) {
    throw new BadRequestException(err.message);
  }
  if (err instanceof TooManyRequestsAuthException) {
    // 429 Too Many Requests
    throw new HttpException(
      { statusCode: 429, message: err.message, error: 'Too Many Requests' },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
  if (err instanceof AuthException) {
    throw new BadRequestException(err.message);
  }
  throw err;
}

function getClientInfo(req: Request) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket?.remoteAddress || req.ip || '';
  const userAgent = (req.headers['user-agent'] as string) || '';
  return { ip, userAgent };
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly cookieSecure: boolean;
  private readonly refreshTtlMs: number;

  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,
  ) {
    this.cookieSecure = process.env.COOKIE_SECURE === 'true';
    const refreshDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7);
    this.refreshTtlMs = refreshDays * 24 * 60 * 60 * 1000;
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie('pulse_rt', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: this.cookieSecure,
      path: '/api/v1/auth',
      maxAge: this.refreshTtlMs,
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie('pulse_rt', {
      httpOnly: true,
      sameSite: 'strict',
      secure: this.cookieSecure,
      path: '/api/v1/auth',
    });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, type: VerifyLoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<VerifyLoginResponseDto> {
    const { ip, userAgent } = getClientInfo(req);
    try {
      const result = await this.authService.login(dto.email, dto.password, ip, userAgent);
      this.setRefreshCookie(res, result.raw_refresh_token);
      return {
        access_token: result.access_token,
        token_type: result.token_type,
        expires_in: result.expires_in,
        must_change_password: result.must_change_password,
        user: result.user,
      };
    } catch (err) {
      mapAuthErrorToHttp(err);
    }
  }

  @Post('login/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Verify email OTP and establish session' })
  @ApiResponse({ status: 200, type: VerifyLoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or expired code' })
  async verifyLogin(
    @Body() dto: VerifyLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<VerifyLoginResponseDto> {
    const { ip, userAgent } = getClientInfo(req);
    try {
      const result = await this.authService.verifyLoginOtp(dto.challenge_id, dto.code, ip, userAgent);
      this.setRefreshCookie(res, result.raw_refresh_token);
      return {
        access_token: result.access_token,
        token_type: result.token_type,
        expires_in: result.expires_in,
        must_change_password: result.must_change_password,
        user: result.user,
      };
    } catch (err) {
      mapAuthErrorToHttp(err);
    }
  }

  @Post('login/resend')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Resend email OTP for open challenge adhering to cooldown' })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  @ApiResponse({ status: 429, description: 'Cooldown or rate limit exceeded' })
  async resendOtp(
    @Body() dto: ResendOtpDto,
    @Req() req: Request,
  ): Promise<LoginResponseDto> {
    const { ip, userAgent } = getClientInfo(req);
    try {
      return await this.authService.resendLoginOtp(dto.challenge_id, ip, userAgent);
    } catch (err) {
      mapAuthErrorToHttp(err);
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
  @ApiResponse({ status: 200, type: RefreshResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid, revoked, or expired refresh token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Headers('x-requested-with') requestedWith?: string,
  ): Promise<RefreshResponseDto> {
    if (requestedWith !== 'pulse-web') {
      throw new ForbiddenException('Missing or invalid X-Requested-With header');
    }

    const rawCookie = req.cookies?.['pulse_rt'];
    if (!rawCookie) {
      throw new UnauthorizedException('Refresh token cookie missing');
    }

    const { ip, userAgent } = getClientInfo(req);
    try {
      const result = await this.authService.refreshToken(rawCookie, ip, userAgent);
      this.setRefreshCookie(res, result.raw_refresh_token);
      return {
        access_token: result.access_token,
        expires_in: result.expires_in,
      };
    } catch (err) {
      this.clearRefreshCookie(res);
      mapAuthErrorToHttp(err);
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke current session and clear refresh cookie' })
  @ApiResponse({ status: 204 })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const rawCookie = req.cookies?.['pulse_rt'];
    const sessionId = req.user?.session_id;
    const { ip, userAgent } = getClientInfo(req);

    this.clearRefreshCookie(res);
    await this.authService.logout(rawCookie, sessionId, ip, userAgent);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all sessions for current employee' })
  @ApiResponse({ status: 204 })
  async logoutAll(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const empId = req.user!.emp_id;
    const { ip, userAgent } = getClientInfo(req);

    this.clearRefreshCookie(res);
    await this.authService.logoutAll(empId, ip, userAgent);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get profile information of authenticated user' })
  @ApiResponse({ status: 200, type: MeResponseDto })
  async getMe(@Req() req: Request): Promise<MeResponseDto> {
    const empId = req.user!.emp_id;
    try {
      return await this.authService.getMe(empId);
    } catch (err) {
      mapAuthErrorToHttp(err);
    }
  }

  @Post('password/change')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password and revoke all other sessions' })
  @ApiResponse({ status: 204 })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ): Promise<void> {
    const empId = req.user!.emp_id;
    const sessionId = req.user!.session_id;
    const { ip, userAgent } = getClientInfo(req);

    try {
      await this.authService.changePassword(
        empId,
        sessionId,
        dto.current_password,
        dto.new_password,
        ip,
        userAgent,
      );
    } catch (err) {
      mapAuthErrorToHttp(err);
    }
  }

  @Post('password/forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Request password reset code (always returns 202)' })
  @ApiResponse({ status: 202, type: ForgotPasswordResponseDto })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() req: Request,
  ): Promise<ForgotPasswordResponseDto> {
    const { ip, userAgent } = getClientInfo(req);
    try {
      return await this.authService.forgotPassword(dto.email, ip, userAgent);
    } catch (err) {
      mapAuthErrorToHttp(err);
    }
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Reset password using email OTP and revoke all sessions' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 400, description: 'Invalid email or reset code' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
  ): Promise<void> {
    const { ip, userAgent } = getClientInfo(req);
    try {
      await this.authService.resetPassword(dto.email, dto.code, dto.new_password, ip, userAgent);
    } catch (err) {
      mapAuthErrorToHttp(err);
    }
  }
}
