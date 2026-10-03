import { ApiProperty } from '@nestjs/swagger';

export class AgentUsageDto {
  @ApiProperty({ format: 'uuid' })
  agentId: string;

  @ApiProperty({ example: '2026-10' })
  month: string;

  @ApiProperty({ example: 10000 })
  monthlyTokenLimit: number;

  @ApiProperty({ example: 46 })
  tokensUsed: number;

  @ApiProperty({ example: 9954, description: 'Nunca negativo: 0 quando o consumo chega ao limite ou passa dele' })
  tokensRemaining: number;
}
