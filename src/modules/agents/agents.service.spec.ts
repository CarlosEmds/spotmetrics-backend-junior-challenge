import { NotFoundException } from '@nestjs/common';
import { AgentsService } from './agents.service';

const agent = { id: 'a1', name: 'Bot', systemPrompt: 'Seja breve.', active: true, monthlyTokenLimit: 100 };

function build(found: object | null = agent) {
  const agents = {
    findOne: jest.fn().mockResolvedValue(found ? { ...found } : null),
    merge: jest.fn((target, source) => Object.assign(target, source)),
    save: jest.fn(async (x) => x),
  };
  const service = new AgentsService(agents as any, {} as any);
  return { service, agents };
}

describe('AgentsService.update', () => {
  it('changes only the fields sent and saves the agent', async () => {
    const { service, agents } = build();
    const updated = await service.update('a1', { monthlyTokenLimit: 500 });
    expect(updated).toMatchObject({ name: 'Bot', monthlyTokenLimit: 500 });
    expect(agents.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1', monthlyTokenLimit: 500 }));
  });

  it('throws 404 when the agent does not exist', async () => {
    const { service, agents } = build(null);
    await expect(service.update('x', { name: 'Novo' })).rejects.toBeInstanceOf(NotFoundException);
    expect(agents.save).not.toHaveBeenCalled();
  });
});
