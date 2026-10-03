import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { RabbitMQService } from '../../common/rabbitmq/rabbitmq.service';
import { HealthStatusDto } from './health-status.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly rabbit: RabbitMQService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Saúde da API: conexão com o banco e com o RabbitMQ' })
  @ApiOkResponse({ type: HealthStatusDto, description: 'Banco e fila no ar' })
  @ApiServiceUnavailableResponse({ type: HealthStatusDto, description: 'Banco ou fila fora; mesmo formato, com status degraded' })
  async check(): Promise<HealthStatusDto> {
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
