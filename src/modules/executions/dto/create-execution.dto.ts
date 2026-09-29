import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateExecutionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  input: string;
}
