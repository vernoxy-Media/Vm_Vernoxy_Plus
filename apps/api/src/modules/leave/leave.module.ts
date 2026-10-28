import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { OrganizationModule } from '../organization/organization.module';
import { LeaveService } from './application/services/leave.service';
import { LeaveController } from './presentation/controllers/leave.controller';

@Module({
  imports: [PrismaModule, AuthModule, OrganizationModule],
  controllers: [LeaveController],
  providers: [LeaveService],
  exports: [LeaveService],
})
export class LeaveModule {}
