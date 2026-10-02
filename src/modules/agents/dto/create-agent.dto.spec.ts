import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAgentDto } from './create-agent.dto';

const valid = { name: 'Support Assistant', systemPrompt: 'Você é um assistente cordial.', monthlyTokenLimit: 10000 };

async function invalidFields(body: object): Promise<string[]> {
  const errors = await validate(plainToInstance(CreateAgentDto, body));
  return errors.map((error) => error.property);
}

describe('CreateAgentDto', () => {
  it('accepts a valid agent', async () => {
    expect(await invalidFields(valid)).toEqual([]);
  });

  it.each([0, -5, 2_147_483_648])('rejects monthlyTokenLimit %p', async (monthlyTokenLimit) => {
    expect(await invalidFields({ ...valid, monthlyTokenLimit })).toEqual(['monthlyTokenLimit']);
  });

  it('rejects name and systemPrompt made only of spaces', async () => {
    expect(await invalidFields({ ...valid, name: '   ', systemPrompt: ' ' })).toEqual(['name', 'systemPrompt']);
  });

  it('trims name and systemPrompt', () => {
    const dto = plainToInstance(CreateAgentDto, { ...valid, name: '  Support  ', systemPrompt: ' Seja breve. ' });

    expect(dto.name).toBe('Support');
    expect(dto.systemPrompt).toBe('Seja breve.');
  });
});
