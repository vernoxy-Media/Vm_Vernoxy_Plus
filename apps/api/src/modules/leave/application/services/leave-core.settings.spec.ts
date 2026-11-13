import { LeaveCoreService } from './leave-core.service';

const settingsRow = {
  setting_id: 1,
  leave_year_start: 'JANUARY_TO_DECEMBER',
  count_sandwich_leave: false,
  pending_reminder_hours: 24,
  approve_after_leave_started: true,
  year_end_processing: 'AUTOMATIC',
  comp_off_hours_per_day: '8.00',
};

/** A stand-in for the database: the SELECT answers with what `rows` hands out, INSERTs are counted. */
function fakeDb(rows: Array<any[]>) {
  const executed: string[] = [];
  const queue = [...rows];
  return {
    executed,
    $queryRaw: jest.fn(async () => queue.shift() ?? []),
    $executeRaw: jest.fn(async (strings: TemplateStringsArray) => {
      executed.push(strings.join('?'));
      return 1;
    }),
  };
}

describe('LeaveCoreService.getSettings', () => {
  it('reads the settings row when there is one, without creating anything', async () => {
    const db = fakeDb([[settingsRow]]);
    const s = await new LeaveCoreService({} as never).getSettings(db as never);
    expect(s.leave_year_start).toBe('JANUARY_TO_DECEMBER');
    expect(s.comp_off_hours_per_day).toBe(8);
    expect(db.executed).toHaveLength(0);
  });

  it('puts the default row back when it is missing, instead of failing the Leave page', async () => {
    const db = fakeDb([[], [settingsRow]]);
    const s = await new LeaveCoreService({} as never).getSettings(db as never);
    expect(s.pending_reminder_hours).toBe(24);
    expect(db.executed).toHaveLength(1);
    expect(db.executed[0]).toContain('INSERT INTO leave_general_settings DEFAULT VALUES');
  });

  it('says so plainly when the row cannot be created either', async () => {
    const db = fakeDb([[], []]);
    await expect(new LeaveCoreService({} as never).getSettings(db as never)).rejects.toThrow('could not be created');
  });
});
