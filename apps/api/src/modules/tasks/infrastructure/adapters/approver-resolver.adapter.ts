import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { ApproverResolverPort } from '../../domain/ports/approver-resolver.port';

@Injectable()
export class ApproverResolverAdapter implements ApproverResolverPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getAdminApproverIds(): Promise<number[]> {
    const admins = await this.prisma.employees.findMany({
      where: {
        status: 'Active',
        deleted_at: null,
        roles_employees_role_idToroles: {
          is_admin: true,
        },
      },
      select: { emp_id: true },
    });
    return admins.map((a) => a.emp_id);
  }
}
