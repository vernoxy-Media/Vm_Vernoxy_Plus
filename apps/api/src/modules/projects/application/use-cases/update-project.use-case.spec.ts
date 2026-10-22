import { UpdateProjectUseCase } from './update-project.use-case';
import { ProjectRepositoryPort } from '../../domain/ports/project.repository.port';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('UpdateProjectUseCase', () => {
  let useCase: UpdateProjectUseCase;
  let mockProjectRepo: jest.Mocked<ProjectRepositoryPort>;

  beforeEach(() => {
    mockProjectRepo = {
      createProject: jest.fn(),
      getProjects: jest.fn(),
      getProjectById: jest.fn(),
      updateProject: jest.fn(),
      updateProjectStatus: jest.fn(),
      getAssignableEmployees: jest.fn(),
      createSprint: jest.fn(),
      getSprints: jest.fn(),
      updateSprint: jest.fn(),
      createProjectTask: jest.fn(),
      getSprintTasks: jest.fn(),
    } as any;

    useCase = new UpdateProjectUseCase(mockProjectRepo);
  });

  it('should throw NotFoundException if project does not exist', async () => {
    mockProjectRepo.getProjectById.mockResolvedValue(null);

    await expect(
      useCase.execute(999, { project_name: 'Test' }, 1, true),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException if user is not admin and not project manager', async () => {
    mockProjectRepo.getProjectById.mockResolvedValue({
      project_id: 1,
      project_manager_id: 10,
    } as any);

    await expect(
      useCase.execute(1, { project_name: 'Updated' }, 20, false),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should update project if user is admin', async () => {
    mockProjectRepo.getProjectById.mockResolvedValue({
      project_id: 1,
      project_manager_id: 10,
    } as any);
    mockProjectRepo.updateProject.mockResolvedValue({
      project_id: 1,
      project_name: 'Updated',
    } as any);

    const result = await useCase.execute(1, { project_name: 'Updated' }, 99, true);
    expect(result.project_name).toBe('Updated');
    expect(mockProjectRepo.updateProject).toHaveBeenCalledWith(1, { project_name: 'Updated' }, 99);
  });

  it('should update project if user is assigned project manager', async () => {
    mockProjectRepo.getProjectById.mockResolvedValue({
      project_id: 1,
      project_manager_id: 10,
    } as any);
    mockProjectRepo.updateProject.mockResolvedValue({
      project_id: 1,
      tech_frontend: 'Next.js',
    } as any);

    const result = await useCase.execute(1, { tech_frontend: 'Next.js' }, 10, false);
    expect(result.tech_frontend).toBe('Next.js');
    expect(mockProjectRepo.updateProject).toHaveBeenCalledWith(1, { tech_frontend: 'Next.js' }, 10);
  });
});
