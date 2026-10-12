import { RemoveEmployeePhotoUseCase } from './remove-employee-photo.use-case';
import { EmployeeRepositoryPort } from '../ports/employee.repository.port';
import { EmployeePhotoStoragePort } from '../ports/employee-photo-storage.port';
import { UnitOfWorkPort } from '../ports/unit-of-work.port';
import { NotFoundDomainError } from '../../domain/errors/organization.errors';
import { Employee } from '../../domain/entities/employee.entity';

describe('RemoveEmployeePhotoUseCase', () => {
  let employeeRepo: jest.Mocked<EmployeeRepositoryPort>;
  let photoStorage: jest.Mocked<EmployeePhotoStoragePort>;
  let unitOfWork: UnitOfWorkPort;
  let useCase: RemoveEmployeePhotoUseCase;

  const mockEmployee: Employee = {
    emp_id: 1,
    name: 'Alice Smith',
    email: 'alice@vernoxy.com',
    mob: '+1234567890',
    dep_id: 10,
    role_id: 20,
    status: 'Active',
    joining_date: new Date('2026-01-01'),
    exit_date: null,
    reporting_manager: null,
    created_at: new Date(),
    created_by: 1,
    updated_at: new Date(),
    updated_by: 1,
    deleted_at: null,
    deleted_by: null,
    profile_picture: 'keytoarchive0000000000000000000.webp',
  };

  beforeEach(() => {
    employeeRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByMobile: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      findActiveOptions: jest.fn(),
      countActiveAdmins: jest.fn(),
      checkReportingCycle: jest.fn(),
    } as any;

    photoStorage = {
      putPhoto: jest.fn(),
      archivePhoto: jest.fn(),
      getSignedPhotoUrl: jest.fn(),
    };

    unitOfWork = {
      run: jest.fn().mockImplementation(async (work) => work({})),
    };

    useCase = new RemoveEmployeePhotoUseCase(employeeRepo, photoStorage, unitOfWork);
  });

  it('removes employee photo and archives old photo file', async () => {
    employeeRepo.findById.mockResolvedValue({ ...mockEmployee });

    await useCase.execute({
      employeeId: 1,
      actingAdminId: 2,
    });

    expect(employeeRepo.findById).toHaveBeenCalledWith(1);
    expect(employeeRepo.update).toHaveBeenCalledWith(1, {
      profile_picture: null,
      updated_by: 2,
    }, expect.anything());
    expect(photoStorage.archivePhoto).toHaveBeenCalledWith('keytoarchive0000000000000000000.webp');
  });

  it('does nothing to storage if employee had no photo', async () => {
    employeeRepo.findById.mockResolvedValue({
      ...mockEmployee,
      profile_picture: null,
    });

    await useCase.execute({
      employeeId: 1,
      actingAdminId: 2,
    });

    expect(employeeRepo.update).not.toHaveBeenCalled();
    expect(photoStorage.archivePhoto).not.toHaveBeenCalled();
  });

  it('throws NotFoundDomainError if employee does not exist', async () => {
    employeeRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        employeeId: 999,
        actingAdminId: 1,
      }),
    ).rejects.toThrow(NotFoundDomainError);
  });
});
