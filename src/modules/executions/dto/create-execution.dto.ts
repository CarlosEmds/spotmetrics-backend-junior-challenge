import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';

export class CreateExecutionDto {
  @ApiProperty({
    example: 'Resuma o relatório de vendas do trimestre.',
    maxLength: 10000,
    description: 'Texto para o agente processar; precisa ter pelo menos um caractere visível',
  })
  @IsString()
  @Matches(/\S/, { message: 'input must not be blank' })
  @MaxLength(10000)
  input: string;
}
