import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAgentDto {
  @ApiProperty({ example: 'Support Assistant', minLength: 2, maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ example: 'Responde dúvidas de clientes' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Você é um assistente de suporte cordial.' })
  @IsString()
  @MinLength(1)
  systemPrompt: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({ example: 10000, description: 'Limite mensal de tokens do agente' })
  @IsInt()
  monthlyTokenLimit: number;
}
