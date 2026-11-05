import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';

/** Error in the API's problem+json shape, with the field the message belongs to. */
export function perfError(message: string, field = 'performance', status = HttpStatus.BAD_REQUEST, code = 'PERF_RULE') {
  return new HttpException(
    {
      type: 'about:blank',
      title: status === HttpStatus.FORBIDDEN ? 'Forbidden' : status === HttpStatus.CONFLICT ? 'Conflict' : 'Bad Request',
      status,
      detail: message,
      message,
      errors: [{ field, code, message }],
    },
    status,
  );
}

export function requireEmpId(user: any): number {
  const id = Number(user?.emp_id ?? user?.sub);
  if (!Number.isInteger(id) || id <= 0) {
    throw perfError('Please sign in again.', 'auth', HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED');
  }
  return id;
}

/** Admin = an active employee whose role is marked is_admin (same rule as the rest of HRMS). */
@Injectable()
export class PerformanceAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminIds(): Promise<number[]> {
    const rows = await this.prisma.$queryRaw<Array<{ emp_id: number }>>`
      SELECT e.emp_id FROM employees e JOIN roles r ON r.role_id = e.role_id
      WHERE r.is_admin = true AND e.status = 'Active' AND e.deleted_at IS NULL;
    `;
    return rows.map((r) => Number(r.emp_id));
  }

  async isAdmin(empId: number): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<Array<{ ok: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM employees e JOIN roles r ON r.role_id = e.role_id
        WHERE e.emp_id = ${empId} AND r.is_admin = true AND e.status = 'Active' AND e.deleted_at IS NULL
      ) AS ok;
    `;
    return Boolean(rows[0]?.ok);
  }

  async assertAdmin(user: any): Promise<number> {
    const empId = requireEmpId(user);
    if (!(await this.isAdmin(empId))) {
      throw perfError('Only Admin can do this.', 'performance', HttpStatus.FORBIDDEN, 'FORBIDDEN');
    }
    return empId;
  }
}
