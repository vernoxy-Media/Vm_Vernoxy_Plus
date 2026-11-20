import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AttachmentsService } from './application/services/attachments.service';
import { AttachmentFileStore } from './application/services/attachment-file-store';
import { AttachmentsController } from './presentation/controllers/attachments.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService, AttachmentFileStore],
  exports: [AttachmentsService, AttachmentFileStore],
})
export class AttachmentsModule {}

