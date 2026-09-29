import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RabbitMQService } from '../../common/rabbitmq/rabbitmq.service';

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly rabbit: RabbitMQService,
  ) {}

  @Get()
  async check() {
    let database = 'up';
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      database = 'down';
    }
    const rabbitmq = this.rabbit.isConnected() ? 'up' : 'down';
    const body = { status: database === 'up' && rabbitmq === 'up' ? 'ok' : 'degraded', database, rabbitmq };
    if (body.status !== 'ok') throw new ServiceUnavailableException(body);
    return body;
  }
}
