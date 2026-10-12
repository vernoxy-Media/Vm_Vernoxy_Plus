import { EmployeeRepositoryPort } from '../ports/employee.repository.port';
import { UnitOfWorkPort } from '../ports/unit-of-work.port';
import { EmployeePhotoStoragePort } from '../ports/employee-photo-storage.port';
import { Employee } from '../../domain/entities/employee.entity';
import { NotFoundDomainError } from '../../domain/errors/organization.errors';

export interface UploadEmployeePhotoCommand {
  employeeId: number;
  fileBuffer: Buffer;
  actingAdminId: number;
}

export class UploadEmployeePhotoUseCase {
  constructor(
    private readonly employeeRepo: EmployeeRepositoryPort,
    private readonly photoStorage: EmployeePhotoStoragePort,
    private readonly unitOfWork: UnitOfWorkPort,
  ) {}

  async execute(command: UploadEmployeePhotoCommand): Promise<Employee> {
    const employee = await this.employeeRepo.findById(command.employeeId);
    if (!employee || employee.deleted_at !== null) {
      throw new NotFoundDomainError('Employee', command.employeeId);
    }

    const previousKey = employee.profile_picture;

    // Process and store the new image
    const { key } = await this.photoStorage.putPhoto(command.fileBuffer);

    // Persist new key in transaction
    const updated = await this.unitOfWork.run(async (tx) => {
      return this.employeeRepo.update(
        command.employeeId,
        {
          profile_picture: key,
          updated_by: command.actingAdminId,
        },
        tx,
      );
    });

    // Archive previous photo after commit
    if (previousKey && previousKey !== key) {
      try {
        await this.photoStorage.archivePhoto(previousKey);
      } catch (err) {
        // Log archive failure without rolling back successful photo update
        console.error('Failed to archive previous profile photo:', err);
      }
    }

    // Ensure signed URL is present in return entity
    updated.profile_picture_url = this.photoStorage.getSignedPhotoUrl(key);

    return updated;
  }
}
