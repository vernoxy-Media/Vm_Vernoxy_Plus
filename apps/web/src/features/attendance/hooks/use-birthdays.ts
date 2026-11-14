import { useQuery } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';
import { useAuth } from '@/features/auth/context/AuthContext';

export interface Birthday {
  emp_id: number;
  name: string;
  photo_url: string | null;
  /** YYYY-MM-DD, without the birth year */
  date: string;
  days_until: number;
}

/** Everybody's birthdays today and in the next 10 days. One query, shared by the cards, the header and the sidebar. */
export function useBirthdays() {
  return useQuery({
    queryKey: ['birthdays'],
    queryFn: () => customFetch<Birthday[]>('/api/v1/attendance/birthdays?days=10'),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });
}

/** True on the signed-in person's own birthday */
export function useIsMyBirthday(): boolean {
  const { user } = useAuth();
  const { data = [] } = useBirthdays();
  return Boolean(user && data.some((b) => b.days_until === 0 && b.emp_id === user.emp_id));
}
