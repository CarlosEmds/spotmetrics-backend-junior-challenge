import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateAgentDto } from './update-agent.dto';

async function invalidFields(data: object): Promise<string[]> {
  const errors = await validate(plainToInstance(UpdateAgentDto, data));
  return errors.map((error) => error.property);
}

describe('UpdateAgentDto', () => {
  it('accepts a body with only some of the fields', async () => {
    expect(await invalidFields({ monthlyTokenLimit: 500 })).toEqual([]);
  });

  it('accepts an empty body', async () => {
    expect(await invalidFields({})).toEqual([]);
  });

  it('rejects null in a required field instead of letting the database fail', async () => {
    expect(await invalidFields({ name: null })).toEqual(['name']);
  });

  it('keeps the create rules for the fields that are sent', async () => {
    expect(await invalidFields({ monthlyTokenLimit: 0, systemPrompt: '   ' })).toEqual([
      'systemPrompt',
      'monthlyTokenLimit',
    ]);
  });
});
