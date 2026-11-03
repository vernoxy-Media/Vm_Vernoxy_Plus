import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SalesActor } from '../../application/ports/sales-access-policy.port';
import { SalesRequest } from './sales-access.guard';

/** The authenticated Sales user / Admin resolved by SalesAccessGuard. */
export const CurrentSalesActor = createParamDecorator((_data: unknown, ctx: ExecutionContext): SalesActor => {
  return ctx.switchToHttp().getRequest<SalesRequest>().salesActor as SalesActor;
});
