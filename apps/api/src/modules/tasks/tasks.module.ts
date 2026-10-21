import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule, CreateNotificationUseCase } from '../notifications/public-api';
import { StorageModule } from '../storage/public-api';
import { ApproverResolverPort } from './domain/ports/approver-resolver.port';
import { TaskClockPort } from './domain/ports/clock.port';
import { EmployeeDirectoryPort } from './domain/ports/employee-directory.port';
import { TaskRepositoryPort } from './domain/ports/task.repository.port';
import { TASK_TOKENS } from './domain/ports/tokens';
import { ApproverResolverAdapter } from './infrastructure/adapters/approver-resolver.adapter';
import { EmployeeDirectoryAdapter } from './infrastructure/adapters/employee-directory.adapter';
import { TaskSystemClock } from './infrastructure/adapters/system-clock.adapter';
import { PrismaTaskRepository } from './infrastructure/repositories/prisma-task.repository';
import { CreateTaskUseCase } from './application/use-cases/create-task.use-case';
import { GetAdminBoardUseCase } from './application/use-cases/get-admin-board.use-case';
import { GetAdminSummaryUseCase } from './application/use-cases/get-admin-summary.use-case';
import { GetAssignableEmployeesUseCase } from './application/use-cases/get-assignable-employees.use-case';
import { GetMyBoardUseCase } from './application/use-cases/get-my-board.use-case';
import { GetMySummaryUseCase } from './application/use-cases/get-my-summary.use-case';
import { GetPendingRequestsCountUseCase } from './application/use-cases/get-pending-requests-count.use-case';
import { GetTaskDetailUseCase } from './application/use-cases/get-task-detail.use-case';
import { GetSubTasksUseCase } from './application/use-cases/get-sub-tasks.use-case';
import { MoveTaskStageUseCase } from './application/use-cases/move-task-stage.use-case';
import { TrackWorkSessionUseCase } from './application/use-cases/track-work-session.use-case';
import { UpdateTaskUseCase } from './application/use-cases/update-task.use-case';
import { TasksController } from './presentation/controllers/tasks.controller';
import { MyTasksController } from './presentation/controllers/my-tasks.controller';
import { TaskAdminGuard } from './presentation/guards/task-admin.guard';

@Module({
  imports: [PrismaModule, AuthModule, NotificationsModule, StorageModule],
  controllers: [TasksController, MyTasksController],
  providers: [
    TaskAdminGuard,
    {
      provide: TASK_TOKENS.Clock,
      useClass: TaskSystemClock,
    },
    {
      provide: TASK_TOKENS.ApproverResolver,
      useClass: ApproverResolverAdapter,
    },
    {
      provide: TASK_TOKENS.EmployeeDirectory,
      useClass: EmployeeDirectoryAdapter,
    },
    {
      provide: TASK_TOKENS.TaskRepository,
      useClass: PrismaTaskRepository,
    },
    {
      provide: CreateTaskUseCase,
      useFactory: (
        repo: TaskRepositoryPort,
        dir: EmployeeDirectoryPort,
        clock: TaskClockPort,
        notif: CreateNotificationUseCase,
      ) => new CreateTaskUseCase(repo, dir, clock, notif),
      inject: [
        TASK_TOKENS.TaskRepository,
        TASK_TOKENS.EmployeeDirectory,
        TASK_TOKENS.Clock,
        CreateNotificationUseCase,
      ],
    },
    {
      provide: GetTaskDetailUseCase,
      useFactory: (repo: TaskRepositoryPort) => new GetTaskDetailUseCase(repo),
      inject: [TASK_TOKENS.TaskRepository],
    },
    {
      provide: GetSubTasksUseCase,
      useFactory: (repo: TaskRepositoryPort) => new GetSubTasksUseCase(repo),
      inject: [TASK_TOKENS.TaskRepository],
    },
    {
      provide: UpdateTaskUseCase,
      useFactory: (
        repo: TaskRepositoryPort,
        dir: EmployeeDirectoryPort,
        notif: CreateNotificationUseCase,
      ) => new UpdateTaskUseCase(repo, dir, notif),
      inject: [
        TASK_TOKENS.TaskRepository,
        TASK_TOKENS.EmployeeDirectory,
        CreateNotificationUseCase,
      ],
    },
    {
      provide: MoveTaskStageUseCase,
      useFactory: (
        repo: TaskRepositoryPort,
        resolver: ApproverResolverPort,
        notif: CreateNotificationUseCase,
      ) => new MoveTaskStageUseCase(repo, resolver, notif),
      inject: [
        TASK_TOKENS.TaskRepository,
        TASK_TOKENS.ApproverResolver,
        CreateNotificationUseCase,
      ],
    },
    {
      provide: TrackWorkSessionUseCase,
      useFactory: (
        repo: TaskRepositoryPort,
        resolver: ApproverResolverPort,
        notif: CreateNotificationUseCase,
      ) => new TrackWorkSessionUseCase(repo, resolver, notif),
      inject: [
        TASK_TOKENS.TaskRepository,
        TASK_TOKENS.ApproverResolver,
        CreateNotificationUseCase,
      ],
    },
    {
      provide: GetAdminBoardUseCase,
      useFactory: (repo: TaskRepositoryPort) => new GetAdminBoardUseCase(repo),
      inject: [TASK_TOKENS.TaskRepository],
    },
    {
      provide: GetMyBoardUseCase,
      useFactory: (repo: TaskRepositoryPort) => new GetMyBoardUseCase(repo),
      inject: [TASK_TOKENS.TaskRepository],
    },
    {
      provide: GetAdminSummaryUseCase,
      useFactory: (repo: TaskRepositoryPort) => new GetAdminSummaryUseCase(repo),
      inject: [TASK_TOKENS.TaskRepository],
    },
    {
      provide: GetMySummaryUseCase,
      useFactory: (repo: TaskRepositoryPort) => new GetMySummaryUseCase(repo),
      inject: [TASK_TOKENS.TaskRepository],
    },
    {
      provide: GetPendingRequestsCountUseCase,
      useFactory: (repo: TaskRepositoryPort) => new GetPendingRequestsCountUseCase(repo),
      inject: [TASK_TOKENS.TaskRepository],
    },
    {
      provide: GetAssignableEmployeesUseCase,
      useFactory: (dir: EmployeeDirectoryPort) => new GetAssignableEmployeesUseCase(dir),
      inject: [TASK_TOKENS.EmployeeDirectory],
    },
  ],
  exports: [TASK_TOKENS.TaskRepository],
})
export class TasksModule {}
