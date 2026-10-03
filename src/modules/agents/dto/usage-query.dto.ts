import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

export class UsageQueryDto {
  @ApiPropertyOptional({ example: '2026-09', description: 'Mês no formato YYYY-MM. Se omitido, usa o mês atual (UTC).' })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month must be in the format YYYY-MM' })
  month?: string;
}
