import { describe, it, expect } from 'vitest';
import { validateApiResponse, validateSlackWebhookUrl, ValidationError } from '../validate.js';

describe('validateApiResponse', () => {
  it('validates a correct response', () => {
    const data = {
      status: true,
      transaction_id: 'abc123',
      transaction_state: 'completed',
      data: [{ name: 'test' }],
    };

    const result = validateApiResponse(data, '/test');
    expect(result.status).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it('rejects null response', () => {
    expect(() => validateApiResponse(null, '/test'))
      .toThrow(ValidationError);
  });

  it('rejects missing status field', () => {
    expect(() =>
      validateApiResponse({ transaction_id: 'x', transaction_state: 'ok', data: [] }, '/test'),
    ).toThrow('missing or invalid \'status\' field');
  });

  it('rejects missing transaction_id', () => {
    expect(() =>
      validateApiResponse({ status: true, transaction_state: 'ok', data: [] }, '/test'),
    ).toThrow('missing or invalid \'transaction_id\' field');
  });

  it('rejects non-array data', () => {
    expect(() =>
      validateApiResponse({ status: true, transaction_id: 'x', transaction_state: 'ok', data: 'bad' }, '/test'),
    ).toThrow('not an array');
  });

  it('allows missing data field', () => {
    const result = validateApiResponse(
      { status: true, transaction_id: 'x', transaction_state: 'ok' },
      '/test',
    );
    expect(result.data).toBeUndefined();
  });
});

describe('validateSlackWebhookUrl', () => {
  it('accepts valid slack webhook URL', () => {
    expect(() =>
      validateSlackWebhookUrl('https://hooks.slack.com/services/T00/B00/xxx'),
    ).not.toThrow();
  });

  it('rejects invalid URL', () => {
    expect(() =>
      validateSlackWebhookUrl('https://example.com/webhook'),
    ).toThrow(ValidationError);
  });
});
