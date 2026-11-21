import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ctcError,
  digitsOnly,
  emailError,
  experienceError,
  futureDateError,
  locationError,
  nameError,
  phoneError,
  skillError,
} from './candidate-validation';

describe('candidate form checks', () => {
  it('accepts real names only', () => {
    assert.equal(nameError('Rohan Mehta'), '');
    assert.equal(nameError("D'Souza-Pai"), '');
    assert.match(nameError('Rohan123'), /only letters/);
    assert.match(nameError(''), /required/);
  });

  it('wants a real 10-digit phone and a valid email', () => {
    assert.equal(phoneError('9825011223'), '');
    assert.match(phoneError('98250'), /10 digits/);
    assert.match(phoneError('1111111111'), /real phone/);
    assert.equal(emailError('a@b.co'), '');
    assert.match(emailError('a@b'), /valid email/);
  });

  it('never accepts a negative CTC, and keeps minus signs out of the box', () => {
    assert.equal(ctcError('', 'Current CTC'), '');
    assert.equal(ctcError('480000', 'Current CTC'), '');
    assert.match(ctcError('-5', 'Current CTC'), /cannot be negative/);
    assert.match(ctcError('abc', 'Current CTC'), /must be a number/);
    assert.equal(digitsOnly('-48e0,000'), '480000');
  });

  it('wants experience from an experienced candidate', () => {
    assert.equal(experienceError(2, 6), '');
    assert.match(experienceError(0, 0), /total experience/);
    assert.match(experienceError(2, 12), /Months/);
  });

  it('checks locations, skills and dates', () => {
    assert.equal(locationError('Ahmedabad'), '');
    assert.match(locationError('12345'), /only letters/);
    assert.equal(skillError('SQL', []), '');
    assert.match(skillError('sql', ['SQL']), /already added/);
    assert.match(skillError('x'.repeat(51), []), /at most 50/);
    assert.equal(futureDateError('2026-12-01', 'Last working day', '2026-11-20'), '');
    assert.match(futureDateError('2026-11-01', 'Last working day', '2026-11-20'), /past/);
  });
});
