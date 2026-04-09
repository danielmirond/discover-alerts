import type { ApiResponse } from '../types.js';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateApiResponse<T>(data: unknown, endpoint: string): ApiResponse<T> {
  if (typeof data !== 'object' || data === null) {
    throw new ValidationError(`${endpoint}: response is not an object`);
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.status !== 'boolean') {
    throw new ValidationError(`${endpoint}: missing or invalid 'status' field`);
  }

  if (typeof obj.transaction_id !== 'string') {
    throw new ValidationError(`${endpoint}: missing or invalid 'transaction_id' field`);
  }

  if (typeof obj.transaction_state !== 'string') {
    throw new ValidationError(`${endpoint}: missing or invalid 'transaction_state' field`);
  }

  if (!Array.isArray(obj.data) && obj.data !== undefined && obj.data !== null) {
    throw new ValidationError(`${endpoint}: 'data' field is not an array`);
  }

  return data as ApiResponse<T>;
}

export function validateSlackWebhookUrl(url: string): void {
  if (!url.startsWith('https://hooks.slack.com/')) {
    throw new ValidationError(`Invalid Slack webhook URL: must start with https://hooks.slack.com/`);
  }
}
