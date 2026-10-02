import { ExecutionsConsumer } from './executions.consumer';
import { ExecutionStatus } from './execution-status.enum';

describe('ExecutionsConsumer.process', () => {
  beforeEach(() => {
    process.env.PROCESSING_DELAY_MS = '0';
  });

  function build(execution: object | null, agent: object | null) {
    const agents = { findOne: jest.fn().mockResolvedValue(agent) };
    const executions = { findOne: jest.fn().mockResolvedValue(execution), save: jest.fn(async (x) => x) };
    const service = { addTokensUsed: jest.fn() };
    const consumer = new ExecutionsConsumer(agents as any, executions as any, service as any, {} as any);
    return { consumer, executions, service };
  }

  it('completes a pending execution and records token usage', async () => {
    const execution = { id: 'e1', agentId: 'a1', input: 'hello world', inputTokens: 2, status: ExecutionStatus.PENDING };
    const { consumer, service } = build(execution, { id: 'a1', name: 'Bot', active: true });

    await consumer.process('e1');

    expect(execution.status).toBe(ExecutionStatus.COMPLETED);
    expect(service.addTokensUsed).toHaveBeenCalledWith('a1', expect.any(String), execution['totalTokens']);
  });

  it('fails when the agent does not exist', async () => {
    const execution = { id: 'e1', agentId: 'a1', input: 'x', inputTokens: 1, status: ExecutionStatus.PENDING };
    const { consumer, service } = build(execution, null);

    await consumer.process('e1');

    expect(execution.status).toBe(ExecutionStatus.FAILED);
    expect(service.addTokensUsed).not.toHaveBeenCalled();
  });

  it('skips unknown executions', async () => {
    const { consumer, executions } = build(null, null);

    await consumer.process('missing');

    expect(executions.save).not.toHaveBeenCalled();
  });
});

describe('ExecutionsConsumer.onModuleInit', () => {
  const originalPrefetch = process.env.RABBITMQ_PREFETCH;

  afterEach(() => {
    if (originalPrefetch === undefined) delete process.env.RABBITMQ_PREFETCH;
    else process.env.RABBITMQ_PREFETCH = originalPrefetch;
  });

  it('keeps the default prefetch when RABBITMQ_PREFETCH is empty', async () => {
    process.env.RABBITMQ_PREFETCH = '';
    const channel = { assertQueue: jest.fn(), prefetch: jest.fn(), consume: jest.fn() };
    const consumer = new ExecutionsConsumer({} as any, {} as any, {} as any, { getChannel: () => channel } as any);

    await consumer.onModuleInit();

    expect(channel.prefetch).toHaveBeenCalledWith(5);
  });
});
