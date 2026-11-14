import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DataFlushService } from './application/data-flush.service';
import { MaintenanceController } from './presentation/maintenance.controller';

/** Admin tools for the test (QA) server. */
@Module({
  imports: [AuthModule],
  controllers: [MaintenanceController],
  providers: [DataFlushService],
})
export class MaintenanceModule {}
