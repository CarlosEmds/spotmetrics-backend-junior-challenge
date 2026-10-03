import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createValidationPipe } from '../../config/validation';
import { ExecutionsController } from './executions.controller';
import { ExecutionsService } from './executions.service';

// Testado via HTTP: sobe só o controller, com um service falso e o mesmo ValidationPipe do main.ts.
const AGENT_ID = '3b4f8f6e-1c2d-4a5b-9e8f-000000000001';
const metrics = { agentId: AGENT_ID, totalExecutions: 4, completed: 2, failed: 1, totalTokens: 46, averageTokensPerExecution: 23 };
const service = {
  listByAgent: jest.fn().mockResolvedValue({ data: [], meta: {} }),
  getMetrics: jest.fn().mockResolvedValue(metrics),
};
let app: INestApplication;
let baseUrl: string;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [ExecutionsController],
    providers: [{ provide: ExecutionsService, useValue: service }],
  }).compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(createValidationPipe());
  await app.listen(0, '127.0.0.1');
  baseUrl = await app.getUrl();
});

afterAll(() => app.close());

beforeEach(() => jest.clearAllMocks());

describe('ExecutionsController.listByAgent', () => {
  const list = (query = '') => fetch(`${baseUrl}/agents/${AGENT_ID}/executions${query}`);

  it('converts page, limit, status and order and sends them to the service', async () => {
    const res = await list('?page=2&limit=5&status=FAILED&order=asc');

    expect(res.status).toBe(200);
    expect(service.listByAgent).toHaveBeenCalledWith(
      AGENT_ID,
      expect.objectContaining({ page: 2, limit: 5, status: 'FAILED', order: 'asc' }),
    );
  });

  it('uses the defaults when the query is empty', async () => {
    await list();

    expect(service.listByAgent).toHaveBeenCalledWith(
      AGENT_ID,
      expect.objectContaining({ page: 1, limit: 20, order: 'desc' }),
    );
  });

  it.each(['?status=DONE', '?limit=500', '?page=0'])('returns 400 for %s without calling the service', async (query) => {
    const res = await list(query);

    expect(res.status).toBe(400);
    expect(service.listByAgent).not.toHaveBeenCalled();
  });
});

describe('ExecutionsController.getMetrics', () => {
  it('returns the metrics of the agent', async () => {
    const res = await fetch(`${baseUrl}/agents/${AGENT_ID}/metrics`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(metrics);
    expect(service.getMetrics).toHaveBeenCalledWith(AGENT_ID);
  });

  it('returns 400 for an id that is not a UUID', async () => {
    const res = await fetch(`${baseUrl}/agents/abc/metrics`);

    expect(res.status).toBe(400);
    expect(service.getMetrics).not.toHaveBeenCalled();
  });
});
