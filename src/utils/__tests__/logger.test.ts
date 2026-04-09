import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('logger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('outputs structured JSON', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    // Re-import to get fresh module
    const { logger } = await import('../logger.js');
    logger.info('test message', { key: 'value' });

    expect(spy).toHaveBeenCalledTimes(1);
    const output = JSON.parse(spy.mock.calls[0][0]);
    expect(output.level).toBe('info');
    expect(output.message).toBe('test message');
    expect(output.meta).toEqual({ key: 'value' });
    expect(output.timestamp).toBeDefined();
  });
});
