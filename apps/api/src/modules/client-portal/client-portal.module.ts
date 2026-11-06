import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ClientProjectsService } from './application/client-projects.service';
import { ClientTokenService } from './application/client-token.service';
import { ClientUsersService } from './application/client-users.service';
import { EmployeeLoginsService } from './application/employee-logins.service';
import { ClientAuthGuard } from './presentation/client-auth.guard';
import { ClientLoginsAdminController, ClientPortalController, EmployeeLoginsAdminController } from './presentation/client-portal.controller';

/** Logins for clients and the read-only view of their projects. */
@Module({
  imports: [AuthModule],
  controllers: [ClientPortalController, ClientLoginsAdminController, EmployeeLoginsAdminController],
  providers: [ClientTokenService, ClientUsersService, ClientProjectsService, EmployeeLoginsService, ClientAuthGuard],
})
export class ClientPortalModule {}
