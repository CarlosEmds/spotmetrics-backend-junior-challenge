import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateExecutionDto } from './create-execution.dto';

async function invalidFields(body: object): Promise<string[]> {
  const errors = await validate(plainToInstance(CreateExecutionDto, body));
  return errors.map((error) => error.property);
}

describe('CreateExecutionDto', () => {
  it('accepts an input and keeps the text unchanged', async () => {
    const dto = plainToInstance(CreateExecutionDto, { input: '  Resuma o relatório.  ' });

    expect(await validate(dto)).toEqual([]);
    expect(dto.input).toBe('  Resuma o relatório.  ');
  });

  it.each(['', '     ', '\n\t '])('rejects blank input %p', async (input) => {
    expect(await invalidFields({ input })).toEqual(['input']);
  });
});
