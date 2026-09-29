import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AgentsModule } from './modules/agents/agents.module';
import { ExecutionsModule } from './modules/executions/executions.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [DatabaseModule, AgentsModule, ExecutionsModule, HealthModule],
})
export class AppModule {}
