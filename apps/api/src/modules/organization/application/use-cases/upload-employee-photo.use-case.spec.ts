import { UploadEmployeePhotoUseCase } from './upload-employee-photo.use-case';
import { EmployeeRepositoryPort } from '../ports/employee.repository.port';
import { EmployeePhotoStoragePort } from '../ports/employee-photo-storage.port';
import { UnitOfWorkPort } from '../ports/unit-of-work.port';
import { NotFoundDomainError } from '../../domain/errors/organization.errors';
import { Employee } from '../../domain/entities/employee.entity';

describe('UploadEmployeePhotoUseCase', () => {
  let employeeRepo: jest.Mocked<EmployeeRepositoryPort>;
  let photoStorage: jest.Mocked<EmployeePhotoStoragePort>;
  let unitOfWork: UnitOfWorkPort;
  let useCase: UploadEmployeePhotoUseCase;

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
    profile_picture: 'oldkey00000000000000000000000000.webp',
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

    useCase = new UploadEmployeePhotoUseCase(employeeRepo, photoStorage, unitOfWork);
  });

  it('successfully uploads photo, updates employee and archives previous photo', async () => {
    employeeRepo.findById.mockResolvedValue({ ...mockEmployee });
    const newKey = 'newkey11111111111111111111111111.webp';
    photoStorage.putPhoto.mockResolvedValue({ key: newKey });
    photoStorage.getSignedPhotoUrl.mockReturnValue(`/api/v1/files/profile-photos/${newKey}?exp=123&sig=abc`);

    const updatedEmployee: Employee = {
      ...mockEmployee,
      profile_picture: newKey,
    };
    employeeRepo.update.mockResolvedValue(updatedEmployee);

    const result = await useCase.execute({
      employeeId: 1,
      fileBuffer: Buffer.from('image-data'),
      actingAdminId: 2,
    });

    expect(employeeRepo.findById).toHaveBeenCalledWith(1);
    expect(photoStorage.putPhoto).toHaveBeenCalledWith(Buffer.from('image-data'));
    expect(employeeRepo.update).toHaveBeenCalledWith(1, {
      profile_picture: newKey,
      updated_by: 2,
    }, expect.anything());
    expect(photoStorage.archivePhoto).toHaveBeenCalledWith('oldkey00000000000000000000000000.webp');
    expect(result.profile_picture_url).toBe(`/api/v1/files/profile-photos/${newKey}?exp=123&sig=abc`);
  });

  it('throws NotFoundDomainError if employee does not exist', async () => {
    employeeRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        employeeId: 999,
        fileBuffer: Buffer.from('data'),
        actingAdminId: 1,
      }),
    ).rejects.toThrow(NotFoundDomainError);
  });

  it('throws NotFoundDomainError if employee is soft-deleted', async () => {
    employeeRepo.findById.mockResolvedValue({
      ...mockEmployee,
      deleted_at: new Date(),
    });

    await expect(
      useCase.execute({
        employeeId: 1,
        fileBuffer: Buffer.from('data'),
        actingAdminId: 1,
      }),
    ).rejects.toThrow(NotFoundDomainError);
  });
});
