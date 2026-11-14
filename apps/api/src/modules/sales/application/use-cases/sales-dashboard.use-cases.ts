import { Injectable } from '@nestjs/common';
import { SalesActor } from '../ports/sales-access-policy.port';
import {
  SalesDashboardRepositoryPort,
  SalesDashboardFilters,
  SalesDashboardDataResponse,
  UserChartPermission,
} from '../ports/sales-dashboard.repository.port';

@Injectable()
export class SalesDashboardUseCases {
  constructor(private readonly repo: SalesDashboardRepositoryPort) {}

  async getDashboardData(
    filters: SalesDashboardFilters,
    actor: SalesActor,
    extraOptions?: {
      us03_group_by?: 'day' | 'week' | 'month';
      us08_compare_by?: 'source' | 'owner';
      us09_group_by?: 'day' | 'week' | 'month';
      us12_date?: string;
      us12_follow_up_from?: string;
      us12_follow_up_to?: string;
    }
  ): Promise<SalesDashboardDataResponse> {
    const permissions = await this.repo.getUserPermissions(actor.emp_id, actor.is_admin);
    return this.repo.getDashboardData(filters, actor.emp_id, actor.is_admin, permissions, extraOptions);
  }

  async getConfig(actor: SalesActor) {
    const [config, permissions] = await Promise.all([
      this.repo.getDefaultConfig(),
      this.repo.getUserPermissions(actor.emp_id, actor.is_admin),
    ]);

    return {
      default_filters: config.default_filters,
      chart_permissions: permissions,
      updated_at: config.updated_at,
      updated_by_name: config.updated_by_name,
    };
  }

  async saveDefaults(defaults: any, actor: SalesActor) {
    if (!actor.is_admin) {
      throw new Error('Only administrators can update dashboard defaults');
    }
    await this.repo.saveDefaultConfig(defaults, actor.emp_id);
    return this.getConfig(actor);
  }

  async listUserPermissions(actor: SalesActor): Promise<UserChartPermission[]> {
    if (!actor.is_admin) {
      throw new Error('Only administrators can inspect chart access management');
    }
    return this.repo.listAllUserPermissions();
  }

  async updateUserPermissions(targetEmpId: number, permissions: Record<string, boolean>, actor: SalesActor) {
    if (!actor.is_admin) {
      throw new Error('Only administrators can update user chart access');
    }
    await this.repo.saveUserPermissions(targetEmpId, permissions, actor.emp_id);
    return { success: true };
  }
}
