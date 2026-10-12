import { assertTestEnvironment, checkDatabaseEnvironment, DbQueryable } from './env-guard';

describe('Database Environment Guard (Comment Check)', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("should allow execution when environment marker is exactly 'pulse:test'", async () => {
    const mockClient: DbQueryable = {
      query: jest.fn().mockResolvedValue({
        rows: [{ datname: 'neondb', environment: 'pulse:test' }],
      }),
    };

    await expect(assertTestEnvironment(mockClient)).resolves.toBeUndefined();
    expect(mockClient.query).toHaveBeenCalledWith(
      "SELECT shobj_description(oid, 'pg_database') AS environment FROM pg_database WHERE datname = current_database();"
    );
  });

  it("should abort when environment marker is 'pulse:dev'", async () => {
    const mockClient: DbQueryable = {
      query: jest.fn().mockResolvedValue({
        rows: [{ datname: 'neondb', environment: 'pulse:dev' }],
      }),
    };

    await expect(assertTestEnvironment(mockClient)).rejects.toThrow(
      "ABORT: Database environment guard check failed! Expected 'pulse:test' but found 'pulse:dev'."
    );
  });

  it('should abort when environment marker is NULL', async () => {
    const mockClient: DbQueryable = {
      query: jest.fn().mockResolvedValue({
        rows: [{ datname: 'neondb', environment: null }],
      }),
    };

    await expect(assertTestEnvironment(mockClient)).rejects.toThrow(
      "ABORT: Database environment guard check failed! Expected 'pulse:test' but found 'none'."
    );
  });

  it('should abort when a database connection error occurs during the check', async () => {
    const mockClient: DbQueryable = {
      query: jest.fn().mockRejectedValue(new Error('Connection terminated unexpectedly')),
    };

    await expect(assertTestEnvironment(mockClient)).rejects.toThrow(
      'ABORT: Database environment guard check failed due to connection error: Connection terminated unexpectedly'
    );
  });

  it('should abort if NODE_ENV is production regardless of database comment', async () => {
    process.env.NODE_ENV = 'production';

    const mockClient: DbQueryable = {
      query: jest.fn().mockResolvedValue({
        rows: [{ datname: 'neondb', environment: 'pulse:test' }],
      }),
    };

    await expect(assertTestEnvironment(mockClient)).rejects.toThrow(
      'ABORT: Test execution rejected because NODE_ENV=production'
    );
    expect(mockClient.query).not.toHaveBeenCalled();
  });
});
