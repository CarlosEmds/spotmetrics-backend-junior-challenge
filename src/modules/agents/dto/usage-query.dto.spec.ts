import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UsageQueryDto } from './usage-query.dto';

async function invalidFields(data: object): Promise<string[]> {
  const errors = await validate(plainToInstance(UsageQueryDto, data));
  return errors.map((error) => error.property);
}

describe('UsageQueryDto', () => {
  it('accepts a month in the YYYY-MM format', async () => {
    expect(await invalidFields({ month: '2026-09' })).toEqual([]);
  });

  it('accepts a missing month (defaults to the current one)', async () => {
    expect(await invalidFields({})).toEqual([]);
  });

  it.each(['banana', '2026-13', '2026-00', '2026-9', '26-09', '2026-09-01'])('rejects month %p', async (month) => {
    expect(await invalidFields({ month })).toEqual(['month']);
  });
});
