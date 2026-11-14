import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AppLogger } from '../../../core/logging/logger.service';
import { Argon2PasswordHasher } from '../../auth/public-api';
import { generateTemporaryPassword } from '../domain/client-rules';

/** An Admin gives an employee a new temporary password (the employee must change it at the next sign in). */
@Injectable()
export class EmployeeLoginsService {
  private readonly log = new AppLogger('EmployeeLogins');
  private readonly hasher = new Argon2PasswordHasher();

  constructor(private readonly prisma: PrismaService) {}

  async resetPassword(adminEmpId: number, empId: number): Promise<{ emp_id: number; name: string; email: string; temporary_password: string }> {
    const emp = await this.prisma.employees.findFirst({ where: { emp_id: empId, deleted_at: null }, select: { emp_id: true, name: true, email: true } });
    if (!emp) throw new NotFoundException('Employee not found.');
    const cred = await this.prisma.employee_credentials.findFirst({ where: { emp_id: empId, deleted_at: null }, orderBy: { credential_id: 'desc' }, select: { credential_id: true } });
    if (!cred) throw new NotFoundException('This employee has no login yet. Activate the account first.');

    const temporary = generateTemporaryPassword();
    await this.prisma.employee_credentials.update({
      where: { credential_id: cred.credential_id },
      data: { password_hash: await this.hasher.hash(temporary), must_change_password: true, failed_attempts: 0, locked_until: null, password_changed_at: new Date(), updated_by: adminEmpId, updated_at: new Date() },
    });
    this.log.log(`Employee #${empId} password reset by employee #${adminEmpId}`);
    return { emp_id: emp.emp_id, name: emp.name, email: emp.email, temporary_password: temporary };
  }
}
