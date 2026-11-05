import { CanActivate, ExecutionContext, Global, Module } from '@nestjs/common';
import { EventsService } from '../../src/modules/websockets/public-api';
import { ACCESS_POLICY_TOKEN } from '../../src/modules/auth/public-api';

/** Test double for JwtAuthGuard: the caller is whoever the x-emp-id header says. */
export class HeaderAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const id = Number(req.headers['x-emp-id']);
    if (!id) return false;
    req.user = { emp_id: id };
    return true;
  }
}

/** The real EventsService lives in the global WebsocketsModule; sockets are not needed in these suites. */
@Global()
@Module({ providers: [{ provide: EventsService, useValue: { emitToUser: () => undefined } }], exports: [EventsService] })
export class FakeEventsModule {}

/** Stands in for AuthModule: the Sales module reaches DataTransferModule, which only needs the (unused here) access policy. */
@Module({ providers: [{ provide: ACCESS_POLICY_TOKEN, useValue: {} }], exports: [ACCESS_POLICY_TOKEN] })
export class FakeAuthModule {}
