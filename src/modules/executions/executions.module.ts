import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RabbitMQModule } from '../../common/rabbitmq/rabbitmq.module';
import { Agent } from '../agents/agent.entity';
import { AgentMonthlyUsage } from '../agents/agent-monthly-usage.entity';
import { AgentExecution } from './agent-execution.entity';
import { ExecutionsController } from './executions.controller';
import { ExecutionsService } from './executions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Agent, AgentExecution, AgentMonthlyUsage]), RabbitMQModule],
  controllers: [ExecutionsController],
  providers: [ExecutionsService],
  exports: [ExecutionsService, TypeOrmModule],
})
export class ExecutionsModule {}
