import { DataSource, DataSourceOptions } from 'typeorm';
import { env } from '../config/env';
import { Agent } from '../modules/agents/agent.entity';
import { AgentMonthlyUsage } from '../modules/agents/agent-monthly-usage.entity';
import { AgentExecution } from '../modules/executions/agent-execution.entity';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  ...env.database,
  entities: [Agent, AgentExecution, AgentMonthlyUsage],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
  logging: false,
};

export default new DataSource(dataSourceOptions);
