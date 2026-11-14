export interface BirthdayItem {
  emp_id: number;
  name: string;
  photo_url: string | null;
  /** The next time this birthday happens, YYYY-MM-DD (today counts) */
  date: string;
  /** Days from today, 0 = today */
  days_until: number;
}

export interface BirthdayRepository {
  /** Active employees whose birthday falls between today and today + `days`. The birth year is never exposed. */
  findUpcoming(days: number): Promise<BirthdayItem[]>;
}
