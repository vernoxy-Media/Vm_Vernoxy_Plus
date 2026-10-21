import * as fs from 'fs';
import * as path from 'path';

describe('VerifyFresh Migration Count', () => {
  it('should dynamically count migrations from database/migrations instead of hardcoding 32', () => {
    const scriptContent = fs.readFileSync(
      path.resolve(__dirname, '../../../../database/scripts/verify-fresh.ts'),
      'utf8',
    );
    expect(scriptContent).not.toMatch(/count !== 32/);
    expect(scriptContent).not.toMatch(/\$\{count\}\/32/);
  });
});
