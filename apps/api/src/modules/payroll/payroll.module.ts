import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { OrganizationModule } from '../organization/organization.module';
import { PayrollCalculationService } from './application/services/payroll-calculation.service';
import { PayrollService } from './application/services/payroll.service';
import { PayrollController } from './presentation/controllers/payroll.controller';

@Module({
  imports: [PrismaModule, AuthModule, OrganizationModule],
  controllers: [PayrollController],
  providers: [PayrollCalculationService, PayrollService],
  exports: [PayrollService, PayrollCalculationService],
})
export class PayrollModule {}
