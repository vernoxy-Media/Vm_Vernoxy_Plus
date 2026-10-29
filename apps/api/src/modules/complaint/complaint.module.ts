import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { OrganizationModule } from '../organization/organization.module';
import { ComplaintSettingsService } from './application/services/complaint-settings.service';
import { ComplaintSettingsController } from './presentation/controllers/complaint-settings.controller';
import { ComplaintsService } from './application/services/complaints.service';
import { ComplaintsController } from './presentation/controllers/complaints.controller';

@Module({
  imports: [PrismaModule, AuthModule, OrganizationModule],
  controllers: [ComplaintSettingsController, ComplaintsController],
  providers: [ComplaintSettingsService, ComplaintsService],
  exports: [ComplaintSettingsService, ComplaintsService],
})
export class ComplaintModule {}
