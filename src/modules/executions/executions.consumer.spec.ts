import { ExecutionsConsumer } from './executions.consumer';
import { ExecutionStatus } from './execution-status.enum';

describe('ExecutionsConsumer.process', () => {
  const agent = { id: 'a1', name: 'Bot', active: true, monthlyTokenLimit: 100 };

  beforeEach(() => {
    process.env.PROCESSING_DELAY_MS = '0';
  });

  function build(execution: object | null, agentFound: object | null, tokensUsed = 0) {
    const agents = { findOne: jest.fn().mockResolvedValue(agentFound) };
    const tx = { save: jest.fn(async (x) => x) };
    const executions = {
      findOne: jest.fn().mockResolvedValue(execution),
      save: jest.fn(async (x) => x),
      manager: { transaction: jest.fn(async (work) => work(tx)) },
    };
    const service = { addTokensUsed: jest.fn(), getTokensUsed: jest.fn().mockResolvedValue(tokensUsed) };
    const consumer = new ExecutionsConsumer(agents as any, executions as any, service as any, {} as any);
    return { consumer, executions, service, tx };
  }

  it('completes a pending execution and records token usage', async () => {
    const execution = { id: 'e1', agentId: 'a1', input: 'hello world', inputTokens: 2, status: ExecutionStatus.PENDING };
    const { consumer, service, tx } = build(execution, agent);

    await consumer.process('e1');

    expect(execution.status).toBe(ExecutionStatus.COMPLETED);
    expect(service.addTokensUsed).toHaveBeenCalledWith('a1', expect.any(String), execution['totalTokens'], tx);
  });

  it('saves COMPLETED and adds the tokens in the same transaction', async () => {
    const execution = { id: 'e1', agentId: 'a1', input: 'hello world', inputTokens: 2, status: ExecutionStatus.PENDING };
    const { consumer, executions, service, tx } = build(execution, agent);

    await consumer.process('e1');

    expect(executions.manager.transaction).toHaveBeenCalledTimes(1);
    expect(tx.save).toHaveBeenCalledWith(expect.objectContaining({ status: ExecutionStatus.COMPLETED }));
    expect(service.addTokensUsed.mock.calls[0][3]).toBe(tx);
  });

  it.each([ExecutionStatus.COMPLETED, ExecutionStatus.FAILED])(
    'skips an execution that is already %s, without charging tokens again',
    async (status) => {
      const execution = { id: 'e1', agentId: 'a1', input: 'hello world', inputTokens: 2, status };
      const { consumer, executions, service } = build(execution, agent);

      await consumer.process('e1');

      expect(execution.status).toBe(status);
      expect(executions.save).not.toHaveBeenCalled();
      expect(executions.manager.transaction).not.toHaveBeenCalled();
      expect(service.addTokensUsed).not.toHaveBeenCalled();
    },
  );

  it('processes again an execution left in PROCESSING by a worker that died', async () => {
    const execution = { id: 'e1', agentId: 'a1', input: 'hello world', inputTokens: 2, status: ExecutionStatus.PROCESSING };
    const { consumer, service } = build(execution, agent);

    await consumer.process('e1');

    expect(execution.status).toBe(ExecutionStatus.COMPLETED);
    expect(service.addTokensUsed).toHaveBeenCalledTimes(1);
  });

  it('fails an execution whose agent was deactivated while the message waited in the queue', async () => {
    const execution = { id: 'e1', agentId: 'a1', input: 'hello world', inputTokens: 2, status: ExecutionStatus.PENDING };
    const { consumer, executions, service } = build(execution, { ...agent, active: false });

    await consumer.process('e1');

    expect(execution).toMatchObject({ status: ExecutionStatus.FAILED, error: 'Agent a1 is inactive' });
    expect(executions.manager.transaction).not.toHaveBeenCalled();
    expect(service.addTokensUsed).not.toHaveBeenCalled();
  });

  it('fails an execution when the monthly limit was used up while the message waited in the queue', async () => {
    const execution = { id: 'e1', agentId: 'a1', input: 'hello world', inputTokens: 2, status: ExecutionStatus.PENDING };
    const { consumer, executions, service } = build(execution, { ...agent, monthlyTokenLimit: 10 }, 10);

    await consumer.process('e1');

    expect(execution).toMatchObject({
      status: ExecutionStatus.FAILED,
      error: 'Monthly token limit exceeded: used 10 of 10 tokens',
    });
    expect(executions.manager.transaction).not.toHaveBeenCalled();
    expect(service.addTokensUsed).not.toHaveBeenCalled();
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

describe('ExecutionsConsumer.handle', () => {
  const EXECUTION_ID = 'b3d3c7b2-6a63-4a4b-9d3e-2f1c0e8a9f10';

  function build(processResult: 'ok' | 'error', options: { redelivered?: boolean; updateFails?: boolean } = {}) {
    const channel = { ack: jest.fn(), nack: jest.fn() };
    const executions = {
      update: options.updateFails ? jest.fn().mockRejectedValue(new Error('db down')) : jest.fn(),
    };
    const consumer = new ExecutionsConsumer({} as any, executions as any, {} as any, { getChannel: () => channel } as any);
    const process = jest.spyOn(consumer, 'process');
    if (processResult === 'ok') process.mockResolvedValue();
    else process.mockRejectedValue(new Error('db down'));
    const message = (content: string) => ({ content: Buffer.from(content), fields: { redelivered: !!options.redelivered } });
    const handle = (content: string) => consumer['handle'](message(content) as any);
    return { handle, channel, executions, process };
  }

  it.each(['{"executionId":"abc"}', '{}', 'not json'])('discards the message %p without processing it', async (content) => {
    const { handle, channel, process } = build('ok');

    await handle(content);

    expect(process).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(expect.anything(), false, false);
  });

  it('acks a valid message after processing it', async () => {
    const { handle, channel, process } = build('ok');

    await handle(JSON.stringify({ executionId: EXECUTION_ID }));

    expect(process).toHaveBeenCalledWith(EXECUTION_ID);
    expect(channel.ack).toHaveBeenCalled();
  });

  it('requeues the message once when processing fails for the first time', async () => {
    const { handle, channel, executions } = build('error');

    await handle(JSON.stringify({ executionId: EXECUTION_ID }));

    expect(channel.nack).toHaveBeenCalledWith(expect.anything(), false, true);
    expect(executions.update).not.toHaveBeenCalled();
  });

  it('marks the execution FAILED and acks when the redelivered message fails again', async () => {
    const { handle, channel, executions } = build('error', { redelivered: true });

    await handle(JSON.stringify({ executionId: EXECUTION_ID }));

    expect(executions.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: EXECUTION_ID }),
      expect.objectContaining({ status: ExecutionStatus.FAILED }),
    );
    expect(channel.ack).toHaveBeenCalled();
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('requeues the message when not even FAILED can be saved', async () => {
    const { handle, channel } = build('error', { redelivered: true, updateFails: true });

    await handle(JSON.stringify({ executionId: EXECUTION_ID }));

    expect(channel.nack).toHaveBeenCalledWith(expect.anything(), false, true);
    expect(channel.ack).not.toHaveBeenCalled();
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
