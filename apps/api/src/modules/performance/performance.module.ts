import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PerformanceCyclesService } from './application/services/performance-cycles.service';
import { PerformanceFormsService } from './application/services/performance-forms.service';
import { PerformanceReviewsService } from './application/services/performance-reviews.service';
import { PerformanceSchedulerService } from './application/services/performance-scheduler.service';
import { PerformanceCyclesController } from './presentation/controllers/performance-cycles.controller';
import { PerformanceFormsController } from './presentation/controllers/performance-forms.controller';
import { PerformanceReviewsController } from './presentation/controllers/performance-reviews.controller';

@Module({
  imports: [PrismaModule, AuthModule, NotificationsModule],
  controllers: [
    PerformanceCyclesController,
    PerformanceFormsController,
    PerformanceReviewsController,
  ],
  providers: [
    PerformanceCyclesService,
    PerformanceFormsService,
    PerformanceReviewsService,
    PerformanceSchedulerService,
  ],
  exports: [
    PerformanceCyclesService,
    PerformanceFormsService,
    PerformanceReviewsService,
    PerformanceSchedulerService,
  ],
})
export class PerformanceModule {}

