import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConsumeMessage } from 'amqplib';
import { Repository } from 'typeorm';
import { Agent } from '../agents/agent.entity';
import { currentMonth } from '../agents/agents.service';
import { RabbitMQService } from '../../common/rabbitmq/rabbitmq.service';
import { env } from '../../config/env';
import { AgentExecution } from './agent-execution.entity';
import { ExecutionStatus } from './execution-status.enum';
import { ExecutionMessage, ExecutionsService } from './executions.service';
import { countTokens, simulateAgentOutput } from './tokens';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class ExecutionsConsumer implements OnModuleInit {
  private readonly logger = new Logger(ExecutionsConsumer.name);
  private readonly queue = env.rabbitmq.executionsQueue;
  private readonly delayMs = env.processingDelayMs;
  private readonly prefetch = env.rabbitmq.prefetch;

  constructor(
    @InjectRepository(Agent) private readonly agents: Repository<Agent>,
    @InjectRepository(AgentExecution) private readonly executions: Repository<AgentExecution>,
    private readonly executionsService: ExecutionsService,
    private readonly rabbit: RabbitMQService,
  ) {}

  async onModuleInit(): Promise<void> {
    const channel = this.rabbit.getChannel();
    await channel.assertQueue(this.queue, { durable: true });
    await channel.prefetch(this.prefetch);
    await channel.consume(this.queue, (msg) => void this.handle(msg));
    this.logger.log(`Consuming queue "${this.queue}"`);
  }

  private async handle(msg: ConsumeMessage | null): Promise<void> {
    if (!msg) return;
    const channel = this.rabbit.getChannel();

    let payload: ExecutionMessage;
    try {
      payload = JSON.parse(msg.content.toString()) as ExecutionMessage;
    } catch {
      this.logger.warn('Discarding malformed message');
      channel.nack(msg, false, false);
      return;
    }

    try {
      await this.process(payload.executionId);
      channel.ack(msg);
    } catch (err) {
      this.logger.error(`Error processing ${payload.executionId}, requeueing`, (err as Error).stack);
      channel.nack(msg, false, true);
    }
  }

  async process(executionId: string): Promise<void> {
    const execution = await this.executions.findOne({ where: { id: executionId } });
    if (!execution) {
      this.logger.warn(`Execution ${executionId} not found, skipping`);
      return;
    }

    execution.status = ExecutionStatus.PROCESSING;
    execution.startedAt = new Date();
    await this.executions.save(execution);
    this.logger.log(`Execution ${execution.id} started`);

    const agent = await this.agents.findOne({ where: { id: execution.agentId } });
    if (!agent) {
      execution.status = ExecutionStatus.FAILED;
      execution.error = `Agent ${execution.agentId} not found`;
      execution.completedAt = new Date();
      await this.executions.save(execution);
      return;
    }

    await sleep(this.delayMs);

    const output = simulateAgentOutput(agent.name, execution.input);
    execution.output = output;
    execution.outputTokens = countTokens(output);
    execution.totalTokens = execution.inputTokens + execution.outputTokens;
    execution.status = ExecutionStatus.COMPLETED;
    execution.completedAt = new Date();
    await this.executions.save(execution);

    await this.executionsService.addTokensUsed(agent.id, currentMonth(), execution.totalTokens);
    this.logger.log(`Execution ${execution.id} completed (${execution.totalTokens} tokens)`);
  }
}
