import { ConflictException, NotFoundException } from '@nestjs/common';
import { ExecutionsService } from './executions.service';
import { ExecutionStatus } from './execution-status.enum';

const agent = { id: 'a1', name: 'Bot', active: true, monthlyTokenLimit: 10 };

function build(overrides: { usage?: number; agent?: object | null; publishFails?: boolean } = {}) {
  const agents = { findOne: jest.fn().mockResolvedValue(overrides.agent === undefined ? agent : overrides.agent) };
  const executions = {
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: 'e1', ...x })),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    query: jest.fn(),
  };
  const usage = {
    findOne: jest.fn().mockResolvedValue(overrides.usage === undefined ? null : { tokensUsed: overrides.usage }),
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => x),
    query: jest.fn(),
  };
  const rabbit = {
    publish: overrides.publishFails
      ? jest.fn(() => {
          throw new Error('broker down');
        })
      : jest.fn(),
  };
  const service = new ExecutionsService(agents as any, executions as any, usage as any, rabbit as any);
  return { service, agents, executions, usage, rabbit };
}

describe('ExecutionsService.create', () => {
  it('creates a PENDING execution and publishes to the queue', async () => {
    const { service, rabbit } = build();
    const result = await service.create('a1', { input: 'one two three' });
    expect(result.status).toBe(ExecutionStatus.PENDING);
    expect(result.inputTokens).toBe(3);
    expect(rabbit.publish).toHaveBeenCalledWith(expect.any(String), { executionId: 'e1' });
  });

  it('throws 404 when agent does not exist', async () => {
    const { service } = build({ agent: null });
    await expect(service.create('x', { input: 'hi' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws 409 when the agent is inactive, without saving or publishing', async () => {
    const { service, executions, rabbit } = build({ agent: { ...agent, active: false } });
    await expect(service.create('a1', { input: 'hi' })).rejects.toBeInstanceOf(ConflictException);
    expect(executions.save).not.toHaveBeenCalled();
    expect(rabbit.publish).not.toHaveBeenCalled();
  });

  it('returns 429 when the monthly limit would be exceeded', async () => {
    const { service, rabbit } = build({ usage: 9 });
    await expect(service.create('a1', { input: 'one two' })).rejects.toMatchObject({ status: 429 });
    expect(rabbit.publish).not.toHaveBeenCalled();
  });

  it('marks the execution FAILED when the queue is unavailable', async () => {
    const { service, executions } = build({ publishFails: true });
    await expect(service.create('a1', { input: 'hi' })).rejects.toMatchObject({ status: 503 });
    const lastSave = executions.save.mock.calls.at(-1)?.[0];
    expect(lastSave.status).toBe(ExecutionStatus.FAILED);
  });
});

describe('ExecutionsService.listByAgent', () => {
  const query = { page: 2, limit: 20, order: 'asc' as const };

  it('paginates, filters by status and orders by creation date', async () => {
    const { service, executions } = build();
    executions.findAndCount.mockResolvedValue([[{ id: 'e21' }], 41]);
    const result = await service.listByAgent('a1', { ...query, status: ExecutionStatus.FAILED });
    expect(executions.findAndCount).toHaveBeenCalledWith({
      where: { agentId: 'a1', status: ExecutionStatus.FAILED },
      order: { createdAt: 'asc', id: 'asc' },
      skip: 20,
      take: 20,
    });
    expect(result).toEqual({ data: [{ id: 'e21' }], meta: { page: 2, limit: 20, total: 41, totalPages: 3 } });
  });

  it('does not filter by status when it is not sent', async () => {
    const { service, executions } = build();
    executions.findAndCount.mockResolvedValue([[], 0]);
    await service.listByAgent('a1', query);
    expect(executions.findAndCount.mock.calls[0][0].where).toEqual({ agentId: 'a1' });
  });

  it('throws 404 when the agent does not exist', async () => {
    const { service, executions } = build({ agent: null });
    await expect(service.listByAgent('x', query)).rejects.toBeInstanceOf(NotFoundException);
    expect(executions.findAndCount).not.toHaveBeenCalled();
  });
});

describe('ExecutionsService.getMetrics', () => {
  it('converts the database counts and averages the tokens over the completed executions', async () => {
    const { service, executions } = build();
    executions.query.mockResolvedValue([{ total: '4', completed: '2', failed: '1', tokens: '46' }]);
    const metrics = await service.getMetrics('a1');
    expect(metrics).toEqual({
      agentId: 'a1',
      totalExecutions: 4,
      completed: 2,
      failed: 1,
      totalTokens: 46,
      averageTokensPerExecution: 23,
    });
    const [sql, params] = executions.query.mock.calls[0];
    expect(sql).toContain('COUNT(*) FILTER (WHERE status = $2)');
    expect(params).toEqual(['a1', ExecutionStatus.COMPLETED, ExecutionStatus.FAILED]);
  });

  it('returns an average of 0 when no execution completed, instead of dividing by zero', async () => {
    const { service, executions } = build();
    executions.query.mockResolvedValue([{ total: '1', completed: '0', failed: '1', tokens: '0' }]);
    expect((await service.getMetrics('a1')).averageTokensPerExecution).toBe(0);
  });

  it('rounds the average to two decimals', async () => {
    const { service, executions } = build();
    executions.query.mockResolvedValue([{ total: '3', completed: '3', failed: '0', tokens: '50' }]);
    expect((await service.getMetrics('a1')).averageTokensPerExecution).toBe(16.67);
  });

  it('throws 404 when the agent does not exist', async () => {
    const { service, executions } = build({ agent: null });
    await expect(service.getMetrics('x')).rejects.toBeInstanceOf(NotFoundException);
    expect(executions.query).not.toHaveBeenCalled();
  });
});

describe('ExecutionsService.addTokensUsed', () => {
  it('adds the tokens with a single atomic upsert in the database', async () => {
    const { service, usage } = build();
    await service.addTokensUsed('a1', '2026-09', 5);
    expect(usage.query).toHaveBeenCalledTimes(1);
    const [sql, params] = usage.query.mock.calls[0];
    expect(sql).toContain('ON CONFLICT (agent_id, month)');
    expect(sql).toContain('tokens_used = agent_monthly_usage.tokens_used + EXCLUDED.tokens_used');
    expect(params).toEqual(['a1', '2026-09', 5]);
  });

  it('does not read the current total before writing it', async () => {
    const { service, usage } = build({ usage: 7 });
    await service.addTokensUsed('a1', '2026-09', 5);
    expect(usage.findOne).not.toHaveBeenCalled();
    expect(usage.save).not.toHaveBeenCalled();
  });
});
