import { env } from './env';

describe('env', () => {
  const keys = ['RABBITMQ_PREFETCH', 'RABBITMQ_EXECUTIONS_QUEUE', 'PROCESSING_DELAY_MS'];
  const original: Record<string, string | undefined> = {};
  keys.forEach((key) => (original[key] = process.env[key]));

  afterEach(() => {
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  });

  it('falls back to the defaults when variables are empty', () => {
    process.env.RABBITMQ_PREFETCH = '';
    process.env.RABBITMQ_EXECUTIONS_QUEUE = '';

    expect(env.rabbitmq.prefetch).toBe(5);
    expect(env.rabbitmq.executionsQueue).toBe('agent-executions');
  });

  it('falls back to the default when a number is invalid', () => {
    process.env.PROCESSING_DELAY_MS = 'abc';

    expect(env.processingDelayMs).toBe(2000);
  });

  it('reads valid values', () => {
    process.env.RABBITMQ_PREFETCH = '10';
    process.env.RABBITMQ_EXECUTIONS_QUEUE = 'other-queue';

    expect(env.rabbitmq.prefetch).toBe(10);
    expect(env.rabbitmq.executionsQueue).toBe('other-queue');
  });
});
