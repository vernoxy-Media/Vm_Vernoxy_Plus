import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PushService } from './application/push.service';
import { PushController } from './presentation/push.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
