import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';

@Injectable()
export class LicenseReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // 1. SOFTWARE REGISTER REPORT
  // ---------------------------------------------------------------------------
  async getSoftwareRegisterReport() {
    const list = await this.prisma.software_licenses.findMany({
      orderBy: { software_name: 'asc' },
      include: {
        software_license_categories: true,
        software_license_vendors: true,
        employees_software_licenses_software_owner_idToemployees: {
          select: { emp_id: true, name: true, email: true },
        },
        software_license_terms: {
          orderBy: { term_number: 'desc' },
          take: 1,
        },
        software_license_assignments: {
          where: { status: 'Active' },
          select: { assignment_id: true },
        },
      },
    });

    return list.map((sw) => {
      const latestTerm = sw.software_license_terms[0] || null;
      const assigned = sw.software_license_assignments.length;
      const total = sw.total_seats;

      return {
        software_id: sw.software_id,
        software_code: sw.software_code,
        software_name: sw.software_name,
        category: sw.software_license_categories?.name,
        vendor: sw.software_license_vendors?.name,
        license_type: sw.license_type,
        status: sw.status,
        total_seats: total,
        assigned_seats: assigned,
        available_seats: total !== null ? Math.max(0, total - assigned) : null,
        owner: sw.employees_software_licenses_software_owner_idToemployees?.name,
        billing_cycle: latestTerm?.billing_cycle,
        cost: latestTerm ? Number(latestTerm.cost) : 0,
        start_date: latestTerm?.start_date,
        expiry_date: latestTerm?.expiry_date,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // 2. UPCOMING RENEWALS REPORT (30 / 60 / 90 days)
  // ---------------------------------------------------------------------------
  async getUpcomingRenewalsReport(days = 60) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const horizon = new Date();
    horizon.setDate(today.getDate() + days);
    horizon.setHours(23, 59, 59, 999);

    const softwareList = await this.prisma.software_licenses.findMany({
      where: {
        status: { in: ['Active', 'Expiring Soon'] },
      },
      include: {
        software_license_categories: true,
        software_license_vendors: true,
        employees_software_licenses_software_owner_idToemployees: {
          select: { emp_id: true, name: true, email: true },
        },
        software_license_terms: {
          orderBy: { term_number: 'desc' },
          take: 1,
        },
      },
    });

    const matching = [];
    for (const sw of softwareList) {
      const term = sw.software_license_terms[0];
      if (term && term.expiry_date) {
        const exp = new Date(term.expiry_date);
        if (exp >= today && exp <= horizon) {
          const daysRemaining = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          matching.push({
            software_id: sw.software_id,
            software_code: sw.software_code,
            software_name: sw.software_name,
            category: sw.software_license_categories?.name,
            vendor: sw.software_license_vendors?.name,
            owner: sw.employees_software_licenses_software_owner_idToemployees?.name,
            owner_email: sw.employees_software_licenses_software_owner_idToemployees?.email,
            expiry_date: term.expiry_date,
            days_remaining: daysRemaining,
            current_term_cost: Number(term.cost),
            billing_cycle: term.billing_cycle,
            auto_renews: sw.auto_renews,
          });
        }
      }
    }

    matching.sort((a, b) => a.days_remaining - b.days_remaining);
    return matching;
  }

  // ---------------------------------------------------------------------------
  // 3. ASSIGNMENTS BY EMPLOYEE REPORT
  // ---------------------------------------------------------------------------
  async getAssignmentsByEmployeeReport(empId?: number, departmentId?: number) {
    const where: any = { status: 'Active' };

    if (empId) {
      where.emp_id = empId;
    }
    if (departmentId) {
      where.employees_software_license_assignments_emp_idToemployees = {
        dep_id: departmentId,
      };
    }

    const assignments = await this.prisma.software_license_assignments.findMany({
      where,
      include: {
        software_licenses: {
          include: {
            software_license_vendors: true,
            software_license_categories: true,
          },
        },
        employees_software_license_assignments_emp_idToemployees: {
          select: {
            emp_id: true,
            name: true,
            email: true,
            dep_id: true,
            departments_employees_dep_idTodepartments: { select: { dep_id: true, name: true } },
          },
        },
      },
      orderBy: [
        { emp_id: 'asc' },
        { assigned_from: 'desc' },
      ],
    });

    return assignments.map((a) => ({
      assignment_id: a.assignment_id,
      employee_id: a.emp_id,
      employee_name: a.employees_software_license_assignments_emp_idToemployees?.name,
      employee_email: a.employees_software_license_assignments_emp_idToemployees?.email,
      department: a.employees_software_license_assignments_emp_idToemployees?.departments_employees_dep_idTodepartments?.name,
      software_id: a.software_id,
      software_code: a.software_licenses.software_code,
      software_name: a.software_licenses.software_name,
      category: a.software_licenses.software_license_categories?.name,
      login_account_id: a.login_account_id,
      assigned_from: a.assigned_from,
      is_flagged_to_recover: a.is_flagged_to_recover,
    }));
  }

  // ---------------------------------------------------------------------------
  // 4. SEAT UTILIZATION & WASTAGE REPORT
  // ---------------------------------------------------------------------------
  async getSeatUtilizationReport() {
    const softwareList = await this.prisma.software_licenses.findMany({
      where: {
        status: { in: ['Active', 'Expiring Soon'] },
        total_seats: { not: null },
      },
      include: {
        software_license_categories: true,
        software_license_vendors: true,
        software_license_terms: {
          orderBy: { term_number: 'desc' },
          take: 1,
        },
        software_license_assignments: {
          where: { status: 'Active' },
          select: { assignment_id: true },
        },
      },
    });

    return softwareList.map((sw) => {
      const total = sw.total_seats || 0;
      const assigned = sw.software_license_assignments.length;
      const unused = Math.max(0, total - assigned);
      const utilizationRate = total > 0 ? Math.round((assigned / total) * 100) : 0;
      const latestTerm = sw.software_license_terms[0];
      const cost = latestTerm ? Number(latestTerm.cost) : 0;
      const estimatedWastageCost = total > 0 ? Math.round((unused / total) * cost) : 0;

      return {
        software_id: sw.software_id,
        software_code: sw.software_code,
        software_name: sw.software_name,
        category: sw.software_license_categories?.name,
        vendor: sw.software_license_vendors?.name,
        total_seats: total,
        assigned_seats: assigned,
        unused_seats: unused,
        utilization_rate_pct: utilizationRate,
        current_term_cost: cost,
        estimated_wastage_cost: estimatedWastageCost,
        is_low_adoption: utilizationRate < 50,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // 5. COST BREAKDOWN REPORT
  // ---------------------------------------------------------------------------
  async getCostBreakdownReport() {
    const softwareList = await this.prisma.software_licenses.findMany({
      where: {
        status: { in: ['Active', 'Expiring Soon'] },
      },
      include: {
        software_license_categories: true,
        software_license_vendors: true,
        software_license_terms: {
          orderBy: { term_number: 'desc' },
          take: 1,
        },
      },
    });

    const categorySpend: Record<string, { count: number; spend: number }> = {};
    const vendorSpend: Record<string, { count: number; spend: number }> = {};

    let totalSpend = 0;

    for (const sw of softwareList) {
      const cat = sw.software_license_categories?.name || 'Uncategorized';
      const ven = sw.software_license_vendors?.name || 'Unknown';
      const term = sw.software_license_terms[0];
      const cost = term ? Number(term.cost) : 0;

      totalSpend += cost;

      if (!categorySpend[cat]) categorySpend[cat] = { count: 0, spend: 0 };
      categorySpend[cat].count += 1;
      categorySpend[cat].spend += cost;

      if (!vendorSpend[ven]) vendorSpend[ven] = { count: 0, spend: 0 };
      vendorSpend[ven].count += 1;
      vendorSpend[ven].spend += cost;
    }

    return {
      total_active_software: softwareList.length,
      total_spend: totalSpend,
      by_category: Object.entries(categorySpend).map(([category, data]) => ({
        category,
        software_count: data.count,
        total_cost: data.spend,
        percentage_of_total: totalSpend > 0 ? Math.round((data.spend / totalSpend) * 100) : 0,
      })),
      by_vendor: Object.entries(vendorSpend).map(([vendor, data]) => ({
        vendor,
        software_count: data.count,
        total_cost: data.spend,
        percentage_of_total: totalSpend > 0 ? Math.round((data.spend / totalSpend) * 100) : 0,
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // 6. EXPIRED & DISCONTINUED REPORT
  // ---------------------------------------------------------------------------
  async getExpiredAndDiscontinuedReport() {
    return this.prisma.software_licenses.findMany({
      where: {
        status: { in: ['Expired', 'Discontinued'] },
      },
      include: {
        software_license_categories: true,
        software_license_vendors: true,
        software_license_discontinue_reasons: true,
        software_licenses: {
          select: { software_id: true, software_code: true, software_name: true },
        },
        software_license_terms: {
          orderBy: { term_number: 'desc' },
          take: 1,
        },
      },
      orderBy: { updated_at: 'desc' },
    });
  }

  // ---------------------------------------------------------------------------
  // 7. SYSTEM AUDIT & ACTIVITY LOG REPORT
  // ---------------------------------------------------------------------------
  async getActivityLogsReport(limit = 100) {
    const logs = await this.prisma.activity_logs.findMany({
      where: { entity_type: 'SOFTWARE_LICENSE' },
      take: limit,
      orderBy: { performed_at: 'desc' },
      include: {
        employees: {
          select: { emp_id: true, name: true, email: true, profile_picture: true },
        },
      },
    });

    return logs.map((l) => ({
      log_id: l.log_id.toString(),
      software_id: l.entity_id,
      event: l.event,
      summary: l.summary,
      details: l.details,
      performed_at: l.performed_at,
      performed_by: l.employees,
    }));
  }
}
