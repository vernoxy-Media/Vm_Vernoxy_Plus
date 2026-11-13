import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseApiError } from './api-error';

describe('parseApiError', () => {
  it('reads the detail and the field of a Problem Details body (it has no `message`)', () => {
    const r = parseApiError({ type: 'about:blank', title: 'Unprocessable Entity', status: 422, detail: 'Password must contain at least one number', field: 'password', code: 'WEAK_PASSWORD' });
    assert.equal(r.message, 'Password must contain at least one number');
    assert.deepEqual(r.issues, [{ field: 'password', message: 'Password must contain at least one number' }]);
    assert.equal(r.status, 422);
    assert.equal(r.code, 'WEAK_PASSWORD');
  });

  it('splits the validator list into one issue per field', () => {
    const r = parseApiError({ status: 400, detail: 'email must be an email; mob must be a valid phone number', invalid_params: ['email must be an email', 'mob must be a valid phone number'] });
    assert.deepEqual(r.issues, [
      { field: 'email', message: 'Must be an email' },
      { field: 'mob', message: 'Must be a valid phone number' },
    ]);
  });

  it('keeps a message without a field as the one line', () => {
    const r = parseApiError({ status: 409, detail: '"A+" already exists in this list.' });
    assert.equal(r.message, '"A+" already exists in this list.');
    assert.deepEqual(r.issues, []);
  });

  it('says plainly when the server cannot be reached', () => {
    assert.match(parseApiError(new TypeError('Failed to fetch')).message, /Could not reach the server/);
    assert.match(parseApiError(new Error('NetworkError when attempting to fetch resource')).message, /Could not reach the server/);
  });

  it('falls back when nothing usable came back', () => {
    assert.equal(parseApiError(undefined, 'Try again').message, 'Try again');
    assert.equal(parseApiError({}, 'Try again').message, 'Try again');
    assert.equal(parseApiError('Plain text').message, 'Plain text');
  });
});
