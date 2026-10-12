import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  AuthEventRepository,
  CreateAuthEventData,
} from '../../application/ports/auth.ports';

@Injectable()
export class PrismaAuthEventRepository implements AuthEventRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async createEvent(data: CreateAuthEventData): Promise<void> {
    const truncatedUa = data.user_agent ? data.user_agent.slice(0, 300) : null;
    let validIp = data.ip_address || null;
    if (validIp && validIp.includes('::ffff:')) {
      validIp = validIp.replace('::ffff:', '');
    }

    // Insert directly into partitioned table
    await this.prisma.$executeRaw`
      INSERT INTO auth_events (
        emp_id,
        actor_emp_id,
        event_type,
        session_id,
        identifier_hash,
        ip_address,
        user_agent,
        details
      ) VALUES (
        ${data.emp_id ?? null},
        ${data.actor_emp_id ?? null},
        ${data.event_type}::auth_event_type,
        ${data.session_id ? data.session_id : null}::uuid,
        ${data.identifier_hash ?? null},
        ${validIp},
        ${truncatedUa},
        ${data.details ? JSON.stringify(data.details) : null}::jsonb
      );
    `;
  }
}
