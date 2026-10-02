import { IsString, Matches, MaxLength } from 'class-validator';

export class CreateExecutionDto {
  @IsString()
  @Matches(/\S/, { message: 'input must not be blank' })
  @MaxLength(10000)
  input: string;
}
