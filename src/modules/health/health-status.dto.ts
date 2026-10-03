import { ApiProperty } from '@nestjs/swagger';

export class HealthStatusDto {
  @ApiProperty({ enum: ['ok', 'degraded'] })
  status: string;

  @ApiProperty({ enum: ['up', 'down'], description: 'Resultado de um SELECT 1 no banco' })
  database: string;

  @ApiProperty({ enum: ['up', 'down'], description: 'up quando o canal com o RabbitMQ foi aberto' })
  rabbitmq: string;
}
