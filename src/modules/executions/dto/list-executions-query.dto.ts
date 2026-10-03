import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ExecutionStatus } from '../execution-status.enum';

export class ListExecutionsQueryDto {
  // Query string chega sempre como texto: o @Type converte "2" em 2 antes do @IsInt.
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ enum: ExecutionStatus })
  @IsOptional()
  @IsEnum(ExecutionStatus)
  status?: ExecutionStatus;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc', description: 'Ordem por data de criação' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}
