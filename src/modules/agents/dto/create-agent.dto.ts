import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

/** Maior valor que cabe na coluna integer do Postgres. */
const MAX_TOKEN_LIMIT = 2_147_483_647;

const trim = ({ value }: TransformFnParams) => (typeof value === 'string' ? value.trim() : value);

export class CreateAgentDto {
  @ApiProperty({ example: 'Support Assistant', minLength: 2, maxLength: 120 })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ example: 'Responde dúvidas de clientes' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Você é um assistente de suporte cordial.' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  systemPrompt: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({
    example: 10000,
    minimum: 1,
    maximum: MAX_TOKEN_LIMIT,
    description: 'Limite mensal de tokens do agente',
  })
  @IsInt()
  @Min(1)
  @Max(MAX_TOKEN_LIMIT)
  monthlyTokenLimit: number;
}
