import { useQuery } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';

export interface CompanyProject {
  project_id: number;
  project_no: string;
  project_name: string;
  project_status: string;
  category: string;
  start_date: string;
  deadline: string;
  manager: { emp_id: number; name: string } | null;
  members_count: number;
}

/** The company's projects: the Admin gets all of them, everyone else only the ones they are on (the server decides). */
export function useCompanyProjects(companyId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['/api/v1/sales/companies', companyId, 'projects'],
    enabled: enabled && companyId > 0,
    queryFn: async () => {
      const res = await customFetch<CompanyProject[] | { data: CompanyProject[] }>(`/api/v1/sales/companies/${companyId}/projects`);
      return (Array.isArray(res) ? res : (res as { data: CompanyProject[] }).data) ?? [];
    },
  });
}
