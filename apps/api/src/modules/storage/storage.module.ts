import { Module } from '@nestjs/common';
import { STORAGE_TOKENS } from './application/ports/tokens';
import { LocalDiskStorageAdapter } from './infrastructure/local-disk-storage.adapter';
import { CloudinaryStorageAdapter } from './infrastructure/cloudinary-storage.adapter';
import { SharpImageProcessor } from './infrastructure/sharp-image-processor';
import { FilesController } from './presentation/controllers/files.controller';

const storageDriver = process.env.STORAGE_DRIVER || 'local';

@Module({
  controllers: [FilesController],
  providers: [
    {
      provide: STORAGE_TOKENS.FileStoragePort,
      useClass:
        storageDriver === 'cloudinary'
          ? CloudinaryStorageAdapter
          : LocalDiskStorageAdapter,
    },
    {
      provide: STORAGE_TOKENS.ImageProcessorPort,
      useClass: SharpImageProcessor,
    },
    LocalDiskStorageAdapter,
    CloudinaryStorageAdapter,
    SharpImageProcessor,
  ],
  exports: [
    STORAGE_TOKENS.FileStoragePort,
    STORAGE_TOKENS.ImageProcessorPort,
  ],
})
export class StorageModule {}
