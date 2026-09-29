import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import { env } from '../../config/env';

type Connection = Awaited<ReturnType<typeof amqp.connect>>;

const CONNECT_ATTEMPTS = 15;
const CONNECT_RETRY_DELAY_MS = 2000;

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: Connection;
  private channel: amqp.Channel;

  async onModuleInit(): Promise<void> {
    this.connection = await this.connectWithRetry();
    this.channel = await this.connection.createChannel();
    await this.channel.assertQueue(env.rabbitmq.executionsQueue, { durable: true });

    this.connection.on('error', (err) => {
      this.logger.error(`rabbitmq connection error: ${err.message}`);
    });
    this.connection.on('close', () => {
      // Simplest recovery strategy: let the process die and the orchestrator restart it.
      this.logger.error('rabbitmq connection closed, shutting down');
      process.exit(1);
    });

    this.logger.log(`connected to rabbitmq (queue=${env.rabbitmq.executionsQueue})`);
  }

  async onModuleDestroy(): Promise<void> {
    try {
      this.connection?.removeAllListeners('close');
      await this.channel?.close();
      await this.connection?.close();
    } catch {
      // ignore errors while shutting down
    }
  }

  publish(queue: string, payload: Record<string, unknown>): void {
    const content = Buffer.from(JSON.stringify(payload));
    this.channel.sendToQueue(queue, content, { persistent: true, contentType: 'application/json' });
  }

  getChannel(): amqp.Channel {
    return this.channel;
  }

  isConnected(): boolean {
    return Boolean(this.channel);
  }

  private async connectWithRetry(): Promise<Connection> {
    for (let attempt = 1; attempt <= CONNECT_ATTEMPTS; attempt++) {
      try {
        return await amqp.connect(env.rabbitmq.url);
      } catch (err) {
        this.logger.warn(
          `rabbitmq unavailable (attempt ${attempt}/${CONNECT_ATTEMPTS}): ${(err as Error).message}`,
        );
        await new Promise((resolve) => setTimeout(resolve, CONNECT_RETRY_DELAY_MS));
      }
    }
    throw new Error('could not connect to rabbitmq');
  }
}
