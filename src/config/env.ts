import 'dotenv/config';

function str(name: string, fallback: string): string {
  const raw = process.env[name];
  return raw === undefined || raw === '' ? fallback : raw;
}

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
      host: str('DATABASE_HOST', 'localhost'),
      port: int('DATABASE_PORT', 5432),
      username: str('DATABASE_USER', 'postgres'),
      password: str('DATABASE_PASSWORD', 'postgres'),
      database: str('DATABASE_NAME', 'ai_agents'),
    };
  },
  get rabbitmq() {
    return {
      url: str('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672'),
      executionsQueue: str('RABBITMQ_EXECUTIONS_QUEUE', 'agent-executions'),
      prefetch: int('RABBITMQ_PREFETCH', 5),
    };
  },
  get processingDelayMs() {
    return int('PROCESSING_DELAY_MS', 2000);
  },
};
