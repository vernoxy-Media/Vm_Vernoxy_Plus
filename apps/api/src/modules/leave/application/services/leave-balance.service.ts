import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { Db, LeaveCoreService, LeaveSettings } from './leave-core.service';
import {
  addDays,
  fmtDate,
  leaveYearLabel,
  leaveYearOf,
  leaveYearRange,
  monthName,
  monthStarts,
  monthsLeftInLeaveYear,
  num,
  round2,
  roundDownHalf,
  toDateStr,
  todayStr,
} from '../../domain/leave-dates';

export type BalanceColumn =
  | 'opening_balance'
  | 'credited_days'
  | 'carried_forward_days'
  | 'adjusted_days'
  | 'days_taken'
  | 'days_booked'
  | 'lapsed_days'
  | 'carried_out_days';

export type LedgerEntryType =
  | 'OPENING_BALANCE'
  | 'MONTHLY_CREDIT'
  | 'YEARLY_CREDIT'
  | 'PRO_RATA_CREDIT'
  | 'CARRIED_FORWARD'
  | 'LAPSED'
  | 'COMP_OFF_CREDIT'
  | 'TAKEN'
  | 'RETURNED'
  | 'ADJUSTED';

export interface BalanceRow {
  balance_id: number;
  emp_id: number;
  leave_type_id: number;
  leave_year: number;
  opening_balance: number;
  credited_days: number;
  carried_forward_days: number;
  adjusted_days: number;
  days_taken: number;
  days_booked: number;
  lapsed_days: number;
  carried_out_days: number;
  is_frozen: boolean;
  available: number;
}

const AVAILABLE_SQL = `(opening_balance + credited_days + carried_forward_days + adjusted_days
  - days_taken - days_booked - lapsed_days - carried_out_days)`;

@Injectable()
export class LeaveBalanceService {
  private readonly logger = new Logger(LeaveBalanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly core: LeaveCoreService,
  ) {}

  // ---------------------------------------------------------------------------
  // Rows
  // ---------------------------------------------------------------------------

  normalise(r: any): BalanceRow {
    const row: BalanceRow = {
      balance_id: r.balance_id,
      emp_id: r.emp_id,
      leave_type_id: r.leave_type_id,
      leave_year: Number(r.leave_year),
      opening_balance: num(r.opening_balance),
      credited_days: num(r.credited_days),
      carried_forward_days: num(r.carried_forward_days),
      adjusted_days: num(r.adjusted_days),
      days_taken: num(r.days_taken),
      days_booked: num(r.days_booked),
      lapsed_days: num(r.lapsed_days),
      carried_out_days: num(r.carried_out_days),
      is_frozen: Boolean(r.is_frozen),
      available: 0,
    };
    row.available = round2(
      row.opening_balance + row.credited_days + row.carried_forward_days + row.adjusted_days
        - row.days_taken - row.days_booked - row.lapsed_days - row.carried_out_days,
    );
    return row;
  }

  async ensureRow(db: Db, empId: number, typeId: number, year: number, lock = false): Promise<BalanceRow> {
    await db.$executeRaw`
      INSERT INTO leave_balances (emp_id, leave_type_id, leave_year)
      VALUES (${empId}, ${typeId}, ${year})
      ON CONFLICT (emp_id, leave_type_id, leave_year) DO NOTHING;
    `;
    const rows = lock
      ? await db.$queryRaw<any[]>`
          SELECT * FROM leave_balances
          WHERE emp_id = ${empId} AND leave_type_id = ${typeId} AND leave_year = ${year}
          FOR UPDATE;`
      : await db.$queryRaw<any[]>`
          SELECT * FROM leave_balances
          WHERE emp_id = ${empId} AND leave_type_id = ${typeId} AND leave_year = ${year};`;
    return this.normalise(rows[0]);
  }

  async change(
    db: Db,
    empId: number,
    typeId: number,
    year: number,
    delta: Partial<Record<BalanceColumn, number>>,
  ): Promise<BalanceRow> {
    await this.ensureRow(db, empId, typeId, year);
    const d = (k: BalanceColumn) => round2(delta[k] || 0);
    const [row] = await db.$queryRaw<any[]>`
      UPDATE leave_balances SET
        opening_balance = GREATEST(0, opening_balance + ${d('opening_balance')}),
        credited_days = GREATEST(0, credited_days + ${d('credited_days')}),
        carried_forward_days = GREATEST(0, carried_forward_days + ${d('carried_forward_days')}),
        adjusted_days = adjusted_days + ${d('adjusted_days')},
        days_taken = GREATEST(0, days_taken + ${d('days_taken')}),
        days_booked = GREATEST(0, days_booked + ${d('days_booked')}),
        lapsed_days = GREATEST(0, lapsed_days + ${d('lapsed_days')}),
        carried_out_days = GREATEST(0, carried_out_days + ${d('carried_out_days')}),
        updated_at = clock_timestamp()
      WHERE emp_id = ${empId} AND leave_type_id = ${typeId} AND leave_year = ${year}
      RETURNING *;
    `;
    return this.normalise(row);
  }

  /**
   * Appends a ledger line. When creditKey is given the entry is written once
   * only; returns false if it already existed.
   */
  async ledger(
    db: Db,
    e: {
      empId: number;
      typeId: number;
      year: number;
      entryType: LedgerEntryType;
      days: number;
      balanceAfter: number;
      note: string;
      requestId?: number | null;
      performedBy?: number | null;
      creditKey?: string | null;
      expiryDate?: string | null;
    },
  ): Promise<boolean> {
    if (Math.abs(e.days) < 0.001) return true;
    const rows = await db.$queryRaw<any[]>`
      INSERT INTO leave_ledger (
        emp_id, leave_type_id, entry_type, days, balance_after, note, reference_request_id,
        performed_by, leave_year, credit_key, expiry_date
      ) VALUES (
        ${e.empId}, ${e.typeId}, ${e.entryType}, ${round2(e.days)}, ${round2(e.balanceAfter)},
        ${e.note.slice(0, 500)}, ${e.requestId ?? null}, ${e.performedBy ?? null}, ${e.year},
        ${e.creditKey ?? null}, ${e.expiryDate ?? null}::date
      )
      ON CONFLICT (credit_key) WHERE credit_key IS NOT NULL DO NOTHING
      RETURNING ledger_id;
    `;
    return rows.length > 0;
  }

  /** Adds days to one column and writes the ledger line, once per key. */
  async credit(
    db: Db,
    p: {
      empId: number;
      typeId: number;
      year: number;
      column: BalanceColumn;
      days: number;
      entryType: LedgerEntryType;
      note: string;
      creditKey?: string;
      performedBy?: number | null;
      expiryDate?: string | null;
      requestId?: number | null;
    },
  ): Promise<boolean> {
    if (p.days <= 0) return false;
    const before = await this.ensureRow(db, p.empId, p.typeId, p.year, true);
    const inserted = await this.ledger(db, {
      empId: p.empId,
      typeId: p.typeId,
      year: p.year,
      entryType: p.entryType,
      days: p.days,
      balanceAfter: before.available + p.days,
      note: p.note,
      creditKey: p.creditKey,
      performedBy: p.performedBy ?? null,
      expiryDate: p.expiryDate ?? null,
      requestId: p.requestId ?? null,
    });
    if (!inserted) return false;
    await this.change(db, p.empId, p.typeId, p.year, { [p.column]: p.days });
    return true;
  }

  // ---------------------------------------------------------------------------
  // Credits: opening (pro-rata), monthly, yearly
  // ---------------------------------------------------------------------------

  /**
   * Brings one employee's credits for the current leave year up to date.
   * Safe to run any number of times: each credit has a unique key.
   */
  async runCreditsForEmployee(empId: number, today = todayStr(), settings?: LeaveSettings): Promise<number> {
    const s = settings || (await this.core.getSettings());
    const [emp] = await this.prisma.$queryRaw<any[]>`
      SELECT e.emp_id, e.status::text AS status, e.joining_date, e.leave_policy_id, e.leave_policy_assigned_at,
             p.pro_rata
      FROM employees e
      LEFT JOIN leave_policies p ON p.policy_id = e.leave_policy_id
      WHERE e.emp_id = ${empId} AND e.deleted_at IS NULL;
    `;
    if (!emp || emp.status !== 'Active' || !emp.leave_policy_id) return 0;
    const joined = toDateStr(emp.joining_date);
    if (!joined || joined > today) return 0;

    const year = leaveYearOf(today, s.start_month);
    const { start } = leaveYearRange(year, s.start_month);
    const assignedAt: string | null = emp.leave_policy_assigned_at ? toDateStr(emp.leave_policy_assigned_at) : null;
    const policyChanged = Boolean(assignedAt && assignedAt > joined);
    const proRata = emp.pro_rata !== false;
    const rules = await this.core.getPolicyRules(emp.leave_policy_id);
    let count = 0;

    for (const rule of rules) {
      if (!rule.balance_tracked || rule.status !== 'ACTIVE') continue;
      if (rule.credit_frequency === 'FROM_APPROVED_OT') continue;
      const perYear = num(rule.days_per_year);
      if (perYear <= 0) continue;
      const typeId = rule.leave_type_id;
      const label = leaveYearLabel(year, s.start_month);

      if (rule.credit_frequency === 'YEARLY') {
        if (policyChanged && assignedAt! > start) {
          // Moved to this policy during the year: the next yearly credit is next year.
          continue;
        }
        if (joined >= start) {
          const months = monthsLeftInLeaveYear(joined, s.start_month);
          const days = proRata ? roundDownHalf((perYear * months) / 12) : perYear;
          const ok = await this.prisma.$transaction((tx) =>
            this.credit(tx, {
              empId, typeId, year, column: 'opening_balance', days,
              entryType: 'OPENING_BALANCE',
              note: `Opening Balance from Joining Date ${fmtDate(joined)}: ${rule.code} +${days}`,
              creditKey: `OB:${empId}:${typeId}:${year}`,
            }),
          );
          if (ok) count++;
        } else {
          const ok = await this.prisma.$transaction((tx) =>
            this.credit(tx, {
              empId, typeId, year, column: 'credited_days', days: perYear,
              entryType: 'YEARLY_CREDIT',
              note: `Yearly credit ${label}: ${rule.code} +${perYear}`,
              creditKey: `YC:${empId}:${typeId}:${year}`,
            }),
          );
          if (ok) count++;
        }
        continue;
      }

      // MONTHLY
      const monthly = round2(perYear / 12);
      let firstMonth = start;
      if (joined >= start) {
        const joinedDay = Number(joined.slice(8, 10));
        const joinMonthStart = `${joined.slice(0, 7)}-01`;
        if (!proRata || joinedDay <= 15) {
          const ok = await this.prisma.$transaction((tx) =>
            this.credit(tx, {
              empId, typeId, year, column: 'opening_balance', days: monthly,
              entryType: 'OPENING_BALANCE',
              note: `Opening Balance from Joining Date ${fmtDate(joined)}: ${rule.code} +${monthly}`,
              creditKey: `OB:${empId}:${typeId}:${year}`,
            }),
          );
          if (ok) count++;
        }
        firstMonth = this.nextMonthStart(joinMonthStart);
      }
      if (policyChanged && assignedAt! >= firstMonth) {
        firstMonth = assignedAt!.slice(8, 10) === '01' ? assignedAt! : this.nextMonthStart(`${assignedAt!.slice(0, 7)}-01`);
      }
      for (const m of monthStarts(firstMonth, today)) {
        if (m < start) continue;
        const ok = await this.prisma.$transaction((tx) =>
          this.credit(tx, {
            empId, typeId, year, column: 'credited_days', days: monthly,
            entryType: 'MONTHLY_CREDIT',
            note: `Monthly credit ${monthName(Number(m.slice(5, 7))).slice(0, 3)} ${m.slice(0, 4)}: ${rule.code} +${monthly}`,
            creditKey: `MC:${empId}:${typeId}:${m.slice(0, 7)}`,
          }),
        );
        if (ok) count++;
      }
    }
    return count;
  }

  private nextMonthStart(monthStart: string): string {
    let y = Number(monthStart.slice(0, 4));
    let m = Number(monthStart.slice(5, 7)) + 1;
    if (m > 12) {
      m = 1;
      y++;
    }
    return `${y}-${String(m).padStart(2, '0')}-01`;
  }

  /** Runs credits for every Active employee. Returns employees credited. */
  async runCreditsForAll(today = todayStr()): Promise<Array<{ emp_id: number; credits: number }>> {
    const s = await this.core.getSettings();
    const emps = await this.prisma.$queryRaw<any[]>`
      SELECT emp_id FROM employees
      WHERE status = 'Active' AND deleted_at IS NULL AND leave_policy_id IS NOT NULL;
    `;
    const out: Array<{ emp_id: number; credits: number }> = [];
    for (const e of emps) {
      try {
        const n = await this.runCreditsForEmployee(e.emp_id, today, s);
        if (n > 0) out.push({ emp_id: e.emp_id, credits: n });
      } catch (err: any) {
        this.logger.warn(`Leave credit failed for emp #${e.emp_id}: ${err?.message}`);
      }
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // Year end
  // ---------------------------------------------------------------------------

  async runYearEnd(oldYear: number, performedBy: number | null): Promise<{ processed: number }> {
    const s = await this.core.getSettings();
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT b.*, e.leave_policy_id, t.code, t.balance_tracked
      FROM leave_balances b
      JOIN employees e ON e.emp_id = b.emp_id
      JOIN leave_types t ON t.leave_type_id = b.leave_type_id
      WHERE b.leave_year = ${oldYear} AND b.is_frozen = false AND t.balance_tracked = true;
    `;
    const newYear = oldYear + 1;
    const label = leaveYearLabel(oldYear, s.start_month);
    let processed = 0;

    for (const raw of rows) {
      const key = `YE:${raw.emp_id}:${raw.leave_type_id}:${oldYear}`;
      try {
        await this.prisma.$transaction(async (tx) => {
          const claimed = await tx.$queryRaw<any[]>`
            INSERT INTO leave_credit_runs (run_key, run_type, started_by)
            VALUES (${key}, 'YEAR_END', ${performedBy})
            ON CONFLICT (run_key) DO NOTHING RETURNING run_key;
          `;
          if (!claimed.length) return;
          const row = await this.ensureRow(tx, raw.emp_id, raw.leave_type_id, oldYear, true);
          const remaining = Math.max(0, row.available);
          const rule = await this.core.getRule(raw.leave_policy_id, raw.leave_type_id, tx);
          const isCompOff = rule?.credit_frequency === 'FROM_APPROVED_OT';
          const carry = isCompOff ? remaining : Math.min(remaining, num(rule?.carry_forward_days));
          const lapse = round2(remaining - carry);

          if (lapse > 0) {
            await this.ledger(tx, {
              empId: raw.emp_id, typeId: raw.leave_type_id, year: oldYear, entryType: 'LAPSED',
              days: -lapse, balanceAfter: row.available - lapse,
              note: `Year end ${label}: ${raw.code} -${lapse} lapsed`, performedBy,
            });
          }
          if (carry > 0) {
            await this.ledger(tx, {
              empId: raw.emp_id, typeId: raw.leave_type_id, year: oldYear, entryType: 'CARRIED_FORWARD',
              days: -carry, balanceAfter: 0,
              note: `Year end ${label}: ${raw.code} ${carry} moved to the next leave year`, performedBy,
            });
          }
          await this.change(tx, raw.emp_id, raw.leave_type_id, oldYear, {
            lapsed_days: lapse,
            carried_out_days: carry,
          });
          if (carry > 0) {
            const next = await this.ensureRow(tx, raw.emp_id, raw.leave_type_id, newYear, true);
            await this.ledger(tx, {
              empId: raw.emp_id, typeId: raw.leave_type_id, year: newYear, entryType: 'CARRIED_FORWARD',
              days: carry, balanceAfter: next.available + carry,
              note: `Year end ${label}: ${raw.code} +${carry} carried forward`, performedBy,
            });
            await this.change(tx, raw.emp_id, raw.leave_type_id, newYear, { carried_forward_days: carry });
          }
        });
        processed++;
      } catch (err: any) {
        this.logger.warn(`Year end failed for balance ${raw.balance_id}: ${err?.message}`);
      }
    }

    await this.prisma.$executeRaw`
      INSERT INTO leave_credit_runs (run_key, run_type, started_by, details)
      VALUES (${`YEAR_END:${oldYear}`}, 'YEAR_END', ${performedBy}, ${JSON.stringify({ processed })}::jsonb)
      ON CONFLICT (run_key) DO NOTHING;
    `;
    return { processed };
  }

  async isYearEndDone(oldYear: number): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT run_key FROM leave_credit_runs WHERE run_key = ${`YEAR_END:${oldYear}`} LIMIT 1;
    `;
    return rows.length > 0;
  }

  // ---------------------------------------------------------------------------
  // Comp-off
  // ---------------------------------------------------------------------------

  /** Credits approved OT paid as Comp-off. Returns the grants created. */
  async runCompOffCredits(): Promise<Array<{ emp_id: number; days: number; expiry: string; ot_date: string; hours: number }>> {
    const s = await this.core.getSettings();
    const entries = await this.prisma.$queryRaw<any[]>`
      SELECT o.payroll_ot_entry_id, o.emp_id, o.attendance_date, o.approved_hours, e.leave_policy_id
      FROM payroll_ot_entries o
      JOIN employees e ON e.emp_id = o.emp_id
      WHERE o.ot_paid_as = 'COMP_OFF'
        AND o.status IN ('APPROVED', 'REDUCED')
        AND o.comp_off_credited = false
        AND o.approved_hours > 0;
    `;
    const out: Array<{ emp_id: number; days: number; expiry: string; ot_date: string; hours: number }> = [];
    const today = todayStr();
    const year = leaveYearOf(today, s.start_month);

    for (const o of entries) {
      try {
        const rules = o.leave_policy_id ? await this.core.getPolicyRules(o.leave_policy_id) : [];
        const rule = rules.find((r) => r.credit_frequency === 'FROM_APPROVED_OT');
        if (!rule) continue;
        const hours = num(o.approved_hours);
        const days = roundDownHalf(hours / (s.comp_off_hours_per_day || 8));
        const otDate = toDateStr(o.attendance_date);
        const expiry = addDays(otDate, rule.comp_off_expiry_days || 90);

        await this.prisma.$transaction(async (tx) => {
          if (days > 0) {
            const grant = await tx.$queryRaw<any[]>`
              INSERT INTO leave_comp_off_grants (emp_id, ot_date, ot_hours, days_credited, expiry_date, source_ot_entry_id, leave_year)
              VALUES (${o.emp_id}, ${otDate}::date, ${hours}, ${days}, ${expiry}::date, ${o.payroll_ot_entry_id}, ${year})
              ON CONFLICT (source_ot_entry_id) WHERE source_ot_entry_id IS NOT NULL DO NOTHING
              RETURNING grant_id;
            `;
            if (grant.length) {
              await this.credit(tx, {
                empId: o.emp_id, typeId: rule.leave_type_id, year, column: 'credited_days', days,
                entryType: 'COMP_OFF_CREDIT',
                note: `OT on ${fmtDate(otDate)}, ${hours} hours: ${rule.code} +${days}, expires ${fmtDate(expiry)}`,
                creditKey: `CO:${o.payroll_ot_entry_id}`,
                expiryDate: expiry,
              });
              out.push({ emp_id: o.emp_id, days, expiry, ot_date: otDate, hours });
            }
          }
          await tx.$executeRaw`
            UPDATE payroll_ot_entries SET comp_off_credited = true, updated_at = clock_timestamp()
            WHERE payroll_ot_entry_id = ${o.payroll_ot_entry_id};
          `;
        });
      } catch (err: any) {
        this.logger.warn(`Comp-off credit failed for OT entry ${o.payroll_ot_entry_id}: ${err?.message}`);
      }
    }
    return out;
  }

  /** Lapses Comp-off whose expiry date has passed. */
  async runCompOffExpiry(): Promise<Array<{ emp_id: number; days: number }>> {
    const s = await this.core.getSettings();
    const today = todayStr();
    const year = leaveYearOf(today, s.start_month);
    const grants = await this.prisma.$queryRaw<any[]>`
      SELECT g.grant_id, g.emp_id, g.ot_date, g.days_credited, g.days_used, g.expiry_date, g.is_lapsed, e.leave_policy_id
      FROM leave_comp_off_grants g
      JOIN employees e ON e.emp_id = g.emp_id
      WHERE g.is_lapsed = false AND g.expiry_date < ${today}::date AND g.days_used < g.days_credited;
    `;
    const out: Array<{ emp_id: number; days: number }> = [];
    for (const g of grants) {
      try {
        const rules = g.leave_policy_id ? await this.core.getPolicyRules(g.leave_policy_id) : [];
        const typeId = rules.find((r) => r.credit_frequency === 'FROM_APPROVED_OT')?.leave_type_id
          ?? (await this.findCompOffTypeId());
        if (!typeId) continue;
        const remaining = round2(num(g.days_credited) - num(g.days_used));
        await this.prisma.$transaction(async (tx) => {
          const upd = await tx.$queryRaw<any[]>`
            UPDATE leave_comp_off_grants SET is_lapsed = true, lapsed_at = clock_timestamp()
            WHERE grant_id = ${g.grant_id} AND is_lapsed = false RETURNING grant_id;
          `;
          if (!upd.length) return;
          const row = await this.ensureRow(tx, g.emp_id, typeId, year, true);
          await this.ledger(tx, {
            empId: g.emp_id, typeId, year, entryType: 'LAPSED', days: -remaining,
            balanceAfter: row.available - remaining,
            note: `Comp-off from OT on ${fmtDate(toDateStr(g.ot_date))} expired on ${fmtDate(toDateStr(g.expiry_date))}: -${remaining} lapsed`,
          });
          await this.change(tx, g.emp_id, typeId, year, { lapsed_days: remaining });
        });
        out.push({ emp_id: g.emp_id, days: remaining });
      } catch (err: any) {
        this.logger.warn(`Comp-off expiry failed for grant ${g.grant_id}: ${err?.message}`);
      }
    }
    return out;
  }

  async findCompOffTypeId(): Promise<number | null> {
    const [r] = await this.prisma.$queryRaw<any[]>`
      SELECT leave_type_id FROM leave_policy_rules WHERE credit_frequency = 'FROM_APPROVED_OT' LIMIT 1;
    `;
    return r?.leave_type_id ?? null;
  }

  /** Uses the oldest Comp-off first. Returns the allocation stored on the request. */
  async consumeCompOff(db: Db, empId: number, days: number): Promise<Array<{ grant_id: number; days: number }>> {
    const grants = await db.$queryRaw<any[]>`
      SELECT grant_id, days_credited, days_used FROM leave_comp_off_grants
      WHERE emp_id = ${empId} AND is_lapsed = false AND days_used < days_credited
      ORDER BY expiry_date ASC, grant_id ASC
      FOR UPDATE;
    `;
    let left = days;
    const alloc: Array<{ grant_id: number; days: number }> = [];
    for (const g of grants) {
      if (left <= 0) break;
      const free = round2(num(g.days_credited) - num(g.days_used));
      const use = Math.min(free, left);
      if (use <= 0) continue;
      await db.$executeRaw`UPDATE leave_comp_off_grants SET days_used = days_used + ${use} WHERE grant_id = ${g.grant_id}`;
      alloc.push({ grant_id: g.grant_id, days: use });
      left = round2(left - use);
    }
    return alloc;
  }

  /**
   * Gives Comp-off days back to their original grants. Days whose expiry date
   * has passed lapse at once (BFD Section 7). Returns days lapsed.
   */
  async returnCompOff(
    db: Db,
    empId: number,
    typeId: number,
    year: number,
    alloc: Array<{ grant_id: number; days: number }> | null,
    performedBy: number | null,
    requestNo: string,
  ): Promise<number> {
    if (!alloc?.length) return 0;
    const today = todayStr();
    let lapsed = 0;
    for (const a of alloc) {
      const [g] = await db.$queryRaw<any[]>`
        UPDATE leave_comp_off_grants SET days_used = GREATEST(0, days_used - ${a.days})
        WHERE grant_id = ${a.grant_id} RETURNING expiry_date, is_lapsed;
      `;
      if (!g) continue;
      if (g.is_lapsed || toDateStr(g.expiry_date) < today) {
        lapsed = round2(lapsed + a.days);
        await db.$executeRaw`
          UPDATE leave_comp_off_grants SET days_used = days_used + ${a.days}, is_lapsed = true,
            lapsed_at = COALESCE(lapsed_at, clock_timestamp())
          WHERE grant_id = ${a.grant_id};
        `;
      }
    }
    if (lapsed > 0) {
      const row = await this.ensureRow(db, empId, typeId, year, true);
      await this.ledger(db, {
        empId, typeId, year, entryType: 'LAPSED', days: -lapsed, balanceAfter: row.available - lapsed,
        note: `${requestNo} cancelled after Comp-off expiry: -${lapsed} lapsed at once`, performedBy,
      });
      await this.change(db, empId, typeId, year, { lapsed_days: lapsed });
    }
    return lapsed;
  }

  async nearestCompOffExpiry(empId: number): Promise<string | null> {
    const [r] = await this.prisma.$queryRaw<any[]>`
      SELECT expiry_date FROM leave_comp_off_grants
      WHERE emp_id = ${empId} AND is_lapsed = false AND days_used < days_credited
      ORDER BY expiry_date ASC LIMIT 1;
    `;
    return r ? toDateStr(r.expiry_date) : null;
  }

  // ---------------------------------------------------------------------------
  // Admin adjustments
  // ---------------------------------------------------------------------------

  async adjust(
    p: {
      empId: number;
      typeId: number;
      year: number;
      direction: 'CREDIT' | 'DEBIT';
      days: number;
      note: string;
      adminId: number;
      adminName: string;
      typeCode: string;
    },
    db?: Db,
  ): Promise<BalanceRow> {
    const run = async (tx: Db) => {
      const row = await this.ensureRow(tx, p.empId, p.typeId, p.year, true);
      if (row.is_frozen) throw new BadRequestException('This balance is frozen because the employee was deactivated.');
      const signed = p.direction === 'CREDIT' ? p.days : -p.days;
      if (p.direction === 'DEBIT' && row.available - p.days < -0.001) {
        throw new BadRequestException({
          message: `A Debit cannot take the Available Balance below 0. Available: ${row.available.toFixed(1)} days.`,
          field: 'days',
        });
      }
      await this.ledger(tx, {
        empId: p.empId, typeId: p.typeId, year: p.year, entryType: 'ADJUSTED', days: signed,
        balanceAfter: row.available + signed,
        note: `${p.adminName}: ${p.typeCode} ${signed > 0 ? '+' : ''}${signed}, "${p.note}"`,
        performedBy: p.adminId,
      });
      return this.change(tx, p.empId, p.typeId, p.year, { adjusted_days: signed });
    };
    return db ? run(db) : this.prisma.$transaction((tx) => run(tx));
  }

  async setOpeningBalance(p: {
    empId: number;
    typeId: number;
    year: number;
    value: number;
    note: string;
    adminId: number;
    adminName: string;
    typeCode: string;
  }): Promise<BalanceRow> {
    return this.prisma.$transaction(async (tx) => {
      const row = await this.ensureRow(tx, p.empId, p.typeId, p.year, true);
      const delta = round2(p.value - row.opening_balance);
      if (Math.abs(delta) < 0.001) return row;
      if (row.available + delta < -0.001) {
        throw new BadRequestException('This change would take the Available Balance below 0.');
      }
      await this.ledger(tx, {
        empId: p.empId, typeId: p.typeId, year: p.year, entryType: 'ADJUSTED', days: delta,
        balanceAfter: row.available + delta,
        note: `${p.adminName}: Opening Balance ${p.typeCode} ${row.opening_balance} → ${p.value}, "${p.note}"`,
        performedBy: p.adminId,
      });
      await tx.$executeRaw`
        UPDATE leave_balances SET opening_balance = ${p.value}, opening_set_at = clock_timestamp(), updated_at = clock_timestamp()
        WHERE emp_id = ${p.empId} AND leave_type_id = ${p.typeId} AND leave_year = ${p.year};
      `;
      return this.ensureRow(tx, p.empId, p.typeId, p.year);
    });
  }

  async freezeEmployee(db: Db, empId: number): Promise<void> {
    await db.$executeRaw`UPDATE leave_balances SET is_frozen = true, updated_at = clock_timestamp() WHERE emp_id = ${empId}`;
  }

  availableSql(): string {
    return AVAILABLE_SQL;
  }
}
