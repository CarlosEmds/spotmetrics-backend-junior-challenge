import { ApiProperty } from '@nestjs/swagger';
import { AgentExecution } from '../agent-execution.entity';

export class PageMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 45, description: 'Total de execuções que passam no filtro' })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

export class ExecutionPageDto {
  @ApiProperty({ type: [AgentExecution] })
  data: AgentExecution[];

  @ApiProperty()
  meta: PageMetaDto;
}
