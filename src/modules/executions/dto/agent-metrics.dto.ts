import { ApiProperty } from '@nestjs/swagger';

export class AgentMetricsDto {
  @ApiProperty({ format: 'uuid' })
  agentId: string;

  @ApiProperty({ example: 4, description: 'Todas as execuções, inclusive PENDING e PROCESSING' })
  totalExecutions: number;

  @ApiProperty({ example: 2 })
  completed: number;

  @ApiProperty({ example: 1 })
  failed: number;

  @ApiProperty({ example: 46, description: 'Soma dos tokens das execuções concluídas' })
  totalTokens: number;

  @ApiProperty({ example: 23, description: 'totalTokens ÷ completed, com 2 casas; 0 se nenhuma execução concluiu' })
  averageTokensPerExecution: number;
}
