import { Module } from '@nestjs/common';
import { RabbitMQModule } from '../../common/rabbitmq/rabbitmq.module';
import { HealthController } from './health.controller';

@Module({
  imports: [RabbitMQModule],
  controllers: [HealthController],
})
export class HealthModule {}
