import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';

const AGENT_ID = '3b4f8f6e-1c2d-4a5b-9e8f-000000000001';

describe('AgentsController (HTTP)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const service = { getUsage: jest.fn().mockResolvedValue({ tokensUsed: 0 }) };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AgentsController],
      providers: [{ provide: AgentsService, useValue: service }],
    }).compile();
    app = moduleRef.createNestApplication();
    // Mesma configuração do main.ts
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(() => app.close());

  beforeEach(() => service.getUsage.mockClear());

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
