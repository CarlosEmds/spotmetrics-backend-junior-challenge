import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConsumeMessage } from 'amqplib';
import { isUUID } from 'class-validator';
import { In, Repository } from 'typeorm';
import { Agent } from '../agents/agent.entity';
import { currentMonth } from '../agents/agents.service';
import { RabbitMQService } from '../../common/rabbitmq/rabbitmq.service';
import { env } from '../../config/env';
import { AgentExecution } from './agent-execution.entity';
import { ExecutionStatus } from './execution-status.enum';
import { ExecutionMessage, ExecutionsService } from './executions.service';
import { countTokens, exceedsMonthlyLimit, simulateAgentOutput } from './tokens';

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

    const executionId = this.parseExecutionId(msg);
    if (!executionId) {
      this.logger.warn(`Discarding message without a valid executionId: ${msg.content.toString().slice(0, 200)}`);
      channel.nack(msg, false, false);
      return;
    }

    try {
      await this.process(executionId);
      channel.ack(msg);
    } catch (err) {
      await this.handleFailure(msg, executionId, err as Error);
    }
  }

  private parseExecutionId(msg: ConsumeMessage): string | null {
    try {
      const payload = JSON.parse(msg.content.toString()) as Partial<ExecutionMessage> | null;
      const executionId = payload?.executionId;
      return typeof executionId === 'string' && isUUID(executionId) ? executionId : null;
    } catch {
      return null;
    }
  }

  /** Uma nova tentativa; se a mensagem reentregue falhar de novo, a execução vira FAILED. */
  private async handleFailure(msg: ConsumeMessage, executionId: string, err: Error): Promise<void> {
    const channel = this.rabbit.getChannel();
    if (!msg.fields.redelivered) {
      this.logger.warn(`Error processing ${executionId}, retrying once: ${err.message}`);
      channel.nack(msg, false, true);
      return;
    }
    try {
      await this.executions.update(
        { id: executionId, status: In([ExecutionStatus.PENDING, ExecutionStatus.PROCESSING]) },
        { status: ExecutionStatus.FAILED, error: `Processing failed twice: ${err.message}`, completedAt: new Date() },
      );
      this.logger.error(`Execution ${executionId} failed after a retry: ${err.message}`);
      channel.ack(msg);
    } catch {
      // Nem o FAILED foi gravado (banco fora?): devolve para a fila para não perder a execução.
      this.logger.error(`Could not mark execution ${executionId} as FAILED, requeueing`);
      channel.nack(msg, false, true);
    }
  }

  async process(executionId: string): Promise<void> {
    const execution = await this.executions.findOne({ where: { id: executionId } });
    if (!execution) {
      this.logger.warn(`Execution ${executionId} not found, skipping`);
      return;
    }
    // A entrega é at-least-once: a mesma mensagem pode voltar depois que a execução terminou.
    // PROCESSING é reprocessada, porque o RabbitMQ só reentrega quando a tentativa anterior morreu.
    if (execution.status === ExecutionStatus.COMPLETED || execution.status === ExecutionStatus.FAILED) {
      this.logger.warn(`Execution ${execution.id} is already ${execution.status}, skipping`);
      return;
    }

    execution.status = ExecutionStatus.PROCESSING;
    execution.startedAt = new Date();
    await this.executions.save(execution);
    this.logger.log(`Execution ${execution.id} started`);

    const agent = await this.agents.findOne({ where: { id: execution.agentId } });
    if (!agent) {
      await this.fail(execution, `Agent ${execution.agentId} not found`);
      return;
    }
    // A API já conferiu isso ao enfileirar, mas a mensagem pode ter esperado na fila enquanto o
    // agente era desativado ou as execuções anteriores esgotavam o limite do mês.
    if (!agent.active) {
      await this.fail(execution, `Agent ${agent.id} is inactive`);
      return;
    }
    const used = await this.executionsService.getTokensUsed(agent.id, currentMonth());
    if (exceedsMonthlyLimit(used, execution.inputTokens, agent.monthlyTokenLimit)) {
      await this.fail(execution, `Monthly token limit exceeded: used ${used} of ${agent.monthlyTokenLimit} tokens`);
      return;
    }

    await sleep(this.delayMs);

    const output = simulateAgentOutput(agent.name, execution.input);
    execution.output = output;
    execution.outputTokens = countTokens(output);
    execution.totalTokens = execution.inputTokens + execution.outputTokens;
    execution.status = ExecutionStatus.COMPLETED;
    execution.completedAt = new Date();
    // Concluir e cobrar juntos: ou as duas escritas acontecem, ou nenhuma.
    await this.executions.manager.transaction(async (manager) => {
      await manager.save(execution);
      await this.executionsService.addTokensUsed(agent.id, currentMonth(), execution.totalTokens, manager);
    });
    this.logger.log(`Execution ${execution.id} completed (${execution.totalTokens} tokens)`);
  }

  private async fail(execution: AgentExecution, error: string): Promise<void> {
    execution.status = ExecutionStatus.FAILED;
    execution.error = error;
    execution.completedAt = new Date();
    await this.executions.save(execution);
    this.logger.warn(`Execution ${execution.id} failed: ${error}`);
  }
}
