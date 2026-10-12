export interface EmployeePhotoStoragePort {
  putPhoto(buffer: Buffer): Promise<{ key: string }>;
  archivePhoto(key: string): Promise<void>;
  getSignedPhotoUrl(key: string): string;
}

export const EMPLOYEE_PHOTO_STORAGE_TOKEN = Symbol('EmployeePhotoStoragePort');
