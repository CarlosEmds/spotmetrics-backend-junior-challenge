import 'dotenv/config';

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export const env = {
  get port() {
    return int('PORT', 3000);
  },
  get database() {
    return {
      host: process.env.DATABASE_HOST ?? 'localhost',
      port: int('DATABASE_PORT', 5432),
      username: process.env.DATABASE_USER ?? 'postgres',
      password: process.env.DATABASE_PASSWORD ?? 'postgres',
      database: process.env.DATABASE_NAME ?? 'ai_agents',
    };
  },
  get rabbitmq() {
    return {
      url: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
      executionsQueue: process.env.RABBITMQ_EXECUTIONS_QUEUE ?? 'agent-executions',
      prefetch: int('RABBITMQ_PREFETCH', 5),
    };
  },
  get processingDelayMs() {
    return int('PROCESSING_DELAY_MS', 2000);
  },
};
