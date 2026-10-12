import { EmployeeRepositoryPort } from '../ports/employee.repository.port';
import { UnitOfWorkPort } from '../ports/unit-of-work.port';
import { EmployeePhotoStoragePort } from '../ports/employee-photo-storage.port';
import { NotFoundDomainError } from '../../domain/errors/organization.errors';

export interface RemoveEmployeePhotoCommand {
  employeeId: number;
  actingAdminId: number;
}

export class RemoveEmployeePhotoUseCase {
  constructor(
    private readonly employeeRepo: EmployeeRepositoryPort,
    private readonly photoStorage: EmployeePhotoStoragePort,
    private readonly unitOfWork: UnitOfWorkPort,
  ) {}

  async execute(command: RemoveEmployeePhotoCommand): Promise<void> {
    const employee = await this.employeeRepo.findById(command.employeeId);
    if (!employee || employee.deleted_at !== null) {
      throw new NotFoundDomainError('Employee', command.employeeId);
    }

    const previousKey = employee.profile_picture;

    if (previousKey) {
      await this.unitOfWork.run(async (tx) => {
        return this.employeeRepo.update(
          command.employeeId,
          {
            profile_picture: null,
            updated_by: command.actingAdminId,
          },
          tx,
        );
      });

      try {
        await this.photoStorage.archivePhoto(previousKey);
      } catch (err) {
        console.error('Failed to archive removed profile photo:', err);
      }
    }
  }
}
