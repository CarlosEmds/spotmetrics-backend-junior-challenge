import { NotFoundException } from '@nestjs/common';
import { AgentsService } from './agents.service';

const agent = { id: 'a1', name: 'Bot', systemPrompt: 'Seja breve.', active: true, monthlyTokenLimit: 100 };

function build(found: object | null = agent) {
  const agents = {
    findOne: jest.fn().mockResolvedValue(found ? { ...found } : null),
    merge: jest.fn((target, source) => Object.assign(target, source)),
    save: jest.fn(async (x) => x),
    delete: jest.fn(),
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

describe('AgentsService.remove', () => {
  it('deactivates the agent instead of deleting the row', async () => {
    const { service, agents } = build();
    await service.remove('a1');
    expect(agents.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1', active: false }));
    expect(agents.delete).not.toHaveBeenCalled();
  });

  it('does nothing for an agent that is already inactive, so it can be called again', async () => {
    const { service, agents } = build({ ...agent, active: false });
    await expect(service.remove('a1')).resolves.toBeUndefined();
    expect(agents.save).not.toHaveBeenCalled();
  });

  it('throws 404 when the agent does not exist', async () => {
    const { service } = build(null);
    await expect(service.remove('x')).rejects.toBeInstanceOf(NotFoundException);
  });
});
