import { Module } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AUTH_TOKENS } from './application/ports/tokens';
import { AuthService } from './application/services/auth.service';
import { AuthController } from './presentation/controllers/auth.controller';
import { JwksController } from './presentation/controllers/jwks.controller';
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard';
import { PrismaEmployeeAuthRepository } from './infrastructure/persistence/prisma-employee-auth.repository';
import { PrismaSessionRepository } from './infrastructure/persistence/prisma-session.repository';
import { PrismaOtpRepository } from './infrastructure/persistence/prisma-otp.repository';
import { PrismaAuthEventRepository } from './infrastructure/persistence/prisma-auth-event.repository';
import { Argon2PasswordHasher } from './infrastructure/security/argon2-password-hasher';
import { JoseTokenService } from './infrastructure/security/jose-token.service';
import { HmacOtpService } from './infrastructure/security/hmac-otp.service';
import { SmtpMailAdapter } from './infrastructure/mail/smtp-mail.adapter';
import { SystemClock } from './infrastructure/clock/system-clock';

import { AccessPolicyAdapter, ACCESS_POLICY_TOKEN } from './public-api';
import { StorageModule } from '../storage/public-api';

@Module({
  imports: [StorageModule],
  controllers: [AuthController, JwksController],
  providers: [
    PrismaService,
    AccessPolicyAdapter,
    {
      provide: ACCESS_POLICY_TOKEN,
      useClass: AccessPolicyAdapter,
    },
    PrismaEmployeeAuthRepository,
    PrismaSessionRepository,
    PrismaOtpRepository,
    PrismaAuthEventRepository,
    Argon2PasswordHasher,
    JoseTokenService,
    HmacOtpService,
    SmtpMailAdapter,
    SystemClock,
    JwtAuthGuard,
    {
      provide: AUTH_TOKENS.EmployeeAuthRepository,
      useClass: PrismaEmployeeAuthRepository,
    },
    {
      provide: AUTH_TOKENS.SessionRepository,
      useClass: PrismaSessionRepository,
    },
    {
      provide: AUTH_TOKENS.OtpRepository,
      useClass: PrismaOtpRepository,
    },
    {
      provide: AUTH_TOKENS.AuthEventRepository,
      useClass: PrismaAuthEventRepository,
    },
    {
      provide: AUTH_TOKENS.PasswordHasher,
      useClass: Argon2PasswordHasher,
    },
    {
      provide: AUTH_TOKENS.TokenService,
      useClass: JoseTokenService,
    },
    {
      provide: AUTH_TOKENS.OtpCodeService,
      useClass: HmacOtpService,
    },
    {
      provide: AUTH_TOKENS.MailPort,
      useClass: SmtpMailAdapter,
    },
    {
      provide: AUTH_TOKENS.Clock,
      useClass: SystemClock,
    },
    {
      provide: AuthService,
      useFactory: (
        empRepo: PrismaEmployeeAuthRepository,
        sessRepo: PrismaSessionRepository,
        otpRepo: PrismaOtpRepository,
        eventRepo: PrismaAuthEventRepository,
        hasher: Argon2PasswordHasher,
        tokenService: JoseTokenService,
        otpService: HmacOtpService,
        mailPort: SmtpMailAdapter,
        clock: SystemClock,
      ) =>
        new AuthService(
          empRepo,
          sessRepo,
          otpRepo,
          eventRepo,
          hasher,
          tokenService,
          otpService,
          mailPort,
          clock,
        ),
      inject: [
        AUTH_TOKENS.EmployeeAuthRepository,
        AUTH_TOKENS.SessionRepository,
        AUTH_TOKENS.OtpRepository,
        AUTH_TOKENS.AuthEventRepository,
        AUTH_TOKENS.PasswordHasher,
        AUTH_TOKENS.TokenService,
        AUTH_TOKENS.OtpCodeService,
        AUTH_TOKENS.MailPort,
        AUTH_TOKENS.Clock,
      ],
    },
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    AUTH_TOKENS.TokenService,
    AUTH_TOKENS.SessionRepository,
    AUTH_TOKENS.EmployeeAuthRepository,
    AUTH_TOKENS.Clock,
    AUTH_TOKENS.MailPort,
    ACCESS_POLICY_TOKEN,
    AccessPolicyAdapter,
  ],
})
export class AuthModule {}
