import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { OrganizationModule } from '../organization/organization.module';
import { ExpenseSettingsService } from './application/services/expense-settings.service';
import { ExpenseClaimsService } from './application/services/expense-claims.service';
import { ExpenseSettingsController } from './presentation/controllers/expense-settings.controller';
import { ExpenseClaimsController } from './presentation/controllers/expense-claims.controller';

@Module({
  imports: [PrismaModule, AuthModule, OrganizationModule],
  controllers: [ExpenseSettingsController, ExpenseClaimsController],
  providers: [ExpenseSettingsService, ExpenseClaimsService],
  exports: [ExpenseSettingsService, ExpenseClaimsService],
})
export class ExpenseModule {}
