import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createValidationPipe } from '../../config/validation';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';

// Testado via HTTP: sobe só o controller, com um service falso e o mesmo ValidationPipe do main.ts.
const AGENT_ID = '3b4f8f6e-1c2d-4a5b-9e8f-000000000001';
const service = {
  getUsage: jest.fn().mockResolvedValue({ tokensUsed: 0 }),
  update: jest.fn(async (id: string, dto: object) => ({ id, ...dto })),
};
let app: INestApplication;
let baseUrl: string;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [AgentsController],
    providers: [{ provide: AgentsService, useValue: service }],
  }).compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(createValidationPipe());
  await app.listen(0, '127.0.0.1');
  baseUrl = await app.getUrl();
});

afterAll(() => app.close());

beforeEach(() => jest.clearAllMocks());

describe('AgentsController.usage', () => {
  it('passes a valid month to the service', async () => {
    const res = await fetch(`${baseUrl}/agents/${AGENT_ID}/usage?month=2026-09`);

    expect(res.status).toBe(200);
    expect(service.getUsage).toHaveBeenCalledWith(AGENT_ID, '2026-09');
  });

  it('leaves the month undefined when it is missing, so the service uses the current one', async () => {
    const res = await fetch(`${baseUrl}/agents/${AGENT_ID}/usage`);

    expect(res.status).toBe(200);
    expect(service.getUsage).toHaveBeenCalledWith(AGENT_ID, undefined);
  });

  it('returns 400 for an invalid month without calling the service', async () => {
    const res = await fetch(`${baseUrl}/agents/${AGENT_ID}/usage?month=banana`);

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ message: ['month must be in the format YYYY-MM'] });
    expect(service.getUsage).not.toHaveBeenCalled();
  });
});

describe('AgentsController.update', () => {
  const patch = (body: unknown) =>
    fetch(`${baseUrl}/agents/${AGENT_ID}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('sends only the fields of the body to the service', async () => {
    const res = await patch({ monthlyTokenLimit: 500 });

    expect(res.status).toBe(200);
    expect(service.update).toHaveBeenCalledWith(AGENT_ID, { monthlyTokenLimit: 500 });
  });

  it('returns 400 for null in a required field', async () => {
    const res = await patch({ name: null });

    expect(res.status).toBe(400);
    expect(service.update).not.toHaveBeenCalled();
  });

  it('returns 400 for a field that does not exist', async () => {
    const res = await patch({ owner: 'someone' });

    expect(res.status).toBe(400);
    expect(service.update).not.toHaveBeenCalled();
  });
});
