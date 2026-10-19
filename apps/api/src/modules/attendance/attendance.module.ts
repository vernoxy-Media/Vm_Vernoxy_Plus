import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ATTENDANCE_TOKENS } from './domain/ports/tokens';
import { PrismaAttendanceRepository } from './infrastructure/repositories/prisma-attendance.repository';
import { PrismaAppSettingsRepository } from './infrastructure/repositories/prisma-app-settings.repository';
import { SystemClock } from './infrastructure/adapters/system-clock.adapter';
import { PunchInUseCase } from './application/use-cases/punch-in.use-case';
import { PunchOutUseCase } from './application/use-cases/punch-out.use-case';
import { StartBreakUseCase } from './application/use-cases/start-break.use-case';
import { EndBreakUseCase } from './application/use-cases/end-break.use-case';
import { GetTodayAttendanceUseCase } from './application/use-cases/get-today-attendance.use-case';
import { GetDashboardUseCase } from './application/use-cases/get-dashboard.use-case';
import { GetDayDetailUseCase } from './application/use-cases/get-day-detail.use-case';
import { CreateCorrectionUseCase } from './application/use-cases/create-correction.use-case';
import { ApproveCorrectionUseCase } from './application/use-cases/approve-correction.use-case';
import { RejectCorrectionUseCase } from './application/use-cases/reject-correction.use-case';
import { AdminUpsertDayUseCase } from './application/use-cases/admin-upsert-day.use-case';
import { GetTeamAttendanceUseCase } from './application/use-cases/get-team-attendance.use-case';
import { GetAttendanceReportUseCase } from './application/use-cases/get-attendance-report.use-case';
import { AttendanceController } from './presentation/attendance.controller';
import { AttendanceAdminGuard } from './presentation/guards/attendance-admin.guard';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AttendanceController],
  providers: [
    PrismaAttendanceRepository,
    PrismaAppSettingsRepository,
    SystemClock,
    AttendanceAdminGuard,
    {
      provide: ATTENDANCE_TOKENS.ATTENDANCE_REPOSITORY,
      useExisting: PrismaAttendanceRepository,
    },
    {
      provide: ATTENDANCE_TOKENS.APP_SETTINGS_REPOSITORY,
      useExisting: PrismaAppSettingsRepository,
    },
    {
      provide: ATTENDANCE_TOKENS.CLOCK,
      useExisting: SystemClock,
    },
    {
      provide: PunchInUseCase,
      useFactory: (repo: PrismaAttendanceRepository, clock: SystemClock) =>
        new PunchInUseCase(repo, clock),
      inject: [PrismaAttendanceRepository, SystemClock],
    },
    {
      provide: PunchOutUseCase,
      useFactory: (
        repo: PrismaAttendanceRepository,
        clock: SystemClock,
        appSettingsRepo: PrismaAppSettingsRepository,
      ) => new PunchOutUseCase(repo, clock, appSettingsRepo),
      inject: [PrismaAttendanceRepository, SystemClock, PrismaAppSettingsRepository],
    },
    {
      provide: StartBreakUseCase,
      useFactory: (repo: PrismaAttendanceRepository, clock: SystemClock) =>
        new StartBreakUseCase(repo, clock),
      inject: [PrismaAttendanceRepository, SystemClock],
    },
    {
      provide: EndBreakUseCase,
      useFactory: (repo: PrismaAttendanceRepository, clock: SystemClock) =>
        new EndBreakUseCase(repo, clock),
      inject: [PrismaAttendanceRepository, SystemClock],
    },
    {
      provide: GetTodayAttendanceUseCase,
      useFactory: (repo: PrismaAttendanceRepository, clock: SystemClock) =>
        new GetTodayAttendanceUseCase(repo, clock),
      inject: [PrismaAttendanceRepository, SystemClock],
    },
    {
      provide: GetDashboardUseCase,
      useFactory: (
        repo: PrismaAttendanceRepository,
        settings: PrismaAppSettingsRepository,
        clock: SystemClock,
      ) => new GetDashboardUseCase(repo, settings, clock),
      inject: [PrismaAttendanceRepository, PrismaAppSettingsRepository, SystemClock],
    },
    {
      provide: GetDayDetailUseCase,
      useFactory: (repo: PrismaAttendanceRepository) =>
        new GetDayDetailUseCase(repo),
      inject: [PrismaAttendanceRepository],
    },
    {
      provide: CreateCorrectionUseCase,
      useFactory: (repo: PrismaAttendanceRepository) =>
        new CreateCorrectionUseCase(repo),
      inject: [PrismaAttendanceRepository],
    },
    {
      provide: ApproveCorrectionUseCase,
      useFactory: (repo: PrismaAttendanceRepository) =>
        new ApproveCorrectionUseCase(repo),
      inject: [PrismaAttendanceRepository],
    },
    {
      provide: RejectCorrectionUseCase,
      useFactory: (repo: PrismaAttendanceRepository) =>
        new RejectCorrectionUseCase(repo),
      inject: [PrismaAttendanceRepository],
    },
    {
      provide: AdminUpsertDayUseCase,
      useFactory: (repo: PrismaAttendanceRepository) =>
        new AdminUpsertDayUseCase(repo),
      inject: [PrismaAttendanceRepository],
    },
    {
      provide: GetTeamAttendanceUseCase,
      useFactory: (repo: PrismaAttendanceRepository) =>
        new GetTeamAttendanceUseCase(repo),
      inject: [PrismaAttendanceRepository],
    },
    {
      provide: GetAttendanceReportUseCase,
      useFactory: (repo: PrismaAttendanceRepository) =>
        new GetAttendanceReportUseCase(repo),
      inject: [PrismaAttendanceRepository],
    },
  ],
  exports: [
    ATTENDANCE_TOKENS.ATTENDANCE_REPOSITORY,
    ATTENDANCE_TOKENS.APP_SETTINGS_REPOSITORY,
    ATTENDANCE_TOKENS.CLOCK,
    PunchInUseCase,
    PunchOutUseCase,
    StartBreakUseCase,
    EndBreakUseCase,
    GetTodayAttendanceUseCase,
    GetDashboardUseCase,
    GetDayDetailUseCase,
  ],
})
export class AttendanceModule {}
