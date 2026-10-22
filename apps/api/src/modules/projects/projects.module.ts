import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import {
  PROJECT_TOKENS,
  ProjectRepositoryPort,
} from './domain/ports/project.repository.port';
import { PrismaProjectRepository } from './infrastructure/repositories/prisma-project.repository';
import { CreateProjectUseCase } from './application/use-cases/create-project.use-case';
import { GetProjectsUseCase } from './application/use-cases/get-projects.use-case';
import { GetProjectDetailUseCase } from './application/use-cases/get-project-detail.use-case';
import { UpdateProjectStatusUseCase } from './application/use-cases/update-project-status.use-case';
import { GetAssignableEmployeesUseCase } from './application/use-cases/get-assignable-employees.use-case';
import { CreateSprintUseCase } from './application/use-cases/create-sprint.use-case';
import { GetProjectSprintsUseCase } from './application/use-cases/get-project-sprints.use-case';
import { UpdateSprintUseCase } from './application/use-cases/update-sprint.use-case';
import { CreateProjectTaskUseCase } from './application/use-cases/create-project-task.use-case';
import { GetSprintTasksUseCase } from './application/use-cases/get-sprint-tasks.use-case';
import { UpdateProjectUseCase } from './application/use-cases/update-project.use-case';
import { ProjectsController } from './presentation/controllers/projects.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ProjectsController],
  providers: [
    {
      provide: PROJECT_TOKENS.ProjectRepository,
      useClass: PrismaProjectRepository,
    },
    {
      provide: CreateProjectUseCase,
      useFactory: (repo: ProjectRepositoryPort) => new CreateProjectUseCase(repo),
      inject: [PROJECT_TOKENS.ProjectRepository],
    },
    {
      provide: GetProjectsUseCase,
      useFactory: (repo: ProjectRepositoryPort) => new GetProjectsUseCase(repo),
      inject: [PROJECT_TOKENS.ProjectRepository],
    },
    {
      provide: GetProjectDetailUseCase,
      useFactory: (repo: ProjectRepositoryPort) => new GetProjectDetailUseCase(repo),
      inject: [PROJECT_TOKENS.ProjectRepository],
    },
    {
      provide: UpdateProjectStatusUseCase,
      useFactory: (repo: ProjectRepositoryPort) => new UpdateProjectStatusUseCase(repo),
      inject: [PROJECT_TOKENS.ProjectRepository],
    },
    {
      provide: GetAssignableEmployeesUseCase,
      useFactory: (repo: ProjectRepositoryPort) => new GetAssignableEmployeesUseCase(repo),
      inject: [PROJECT_TOKENS.ProjectRepository],
    },
    {
      provide: CreateSprintUseCase,
      useFactory: (repo: ProjectRepositoryPort) => new CreateSprintUseCase(repo),
      inject: [PROJECT_TOKENS.ProjectRepository],
    },
    {
      provide: GetProjectSprintsUseCase,
      useFactory: (repo: ProjectRepositoryPort) => new GetProjectSprintsUseCase(repo),
      inject: [PROJECT_TOKENS.ProjectRepository],
    },
    {
      provide: UpdateSprintUseCase,
      useFactory: (repo: ProjectRepositoryPort) => new UpdateSprintUseCase(repo),
      inject: [PROJECT_TOKENS.ProjectRepository],
    },
    {
      provide: CreateProjectTaskUseCase,
      useFactory: (repo: ProjectRepositoryPort) => new CreateProjectTaskUseCase(repo),
      inject: [PROJECT_TOKENS.ProjectRepository],
    },
    {
      provide: GetSprintTasksUseCase,
      useFactory: (repo: ProjectRepositoryPort) => new GetSprintTasksUseCase(repo),
      inject: [PROJECT_TOKENS.ProjectRepository],
    },
    {
      provide: UpdateProjectUseCase,
      useFactory: (repo: ProjectRepositoryPort) => new UpdateProjectUseCase(repo),
      inject: [PROJECT_TOKENS.ProjectRepository],
    },
  ],
  exports: [PROJECT_TOKENS.ProjectRepository],
})
export class ProjectsModule {}
