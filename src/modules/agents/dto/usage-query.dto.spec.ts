import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UsageQueryDto } from './usage-query.dto';

async function isValid(query: object): Promise<boolean> {
  const errors = await validate(plainToInstance(UsageQueryDto, query));
  return errors.length === 0;
}

describe('UsageQueryDto', () => {
  it('accepts a month in the YYYY-MM format', async () => {
    expect(await isValid({ month: '2026-09' })).toBe(true);
  });

  it('accepts a missing month (defaults to the current one)', async () => {
    expect(await isValid({})).toBe(true);
  });

  it.each(['banana', '2026-13', '2026-00', '2026-9', '26-09', '2026-09-01'])('rejects month %p', async (month) => {
    expect(await isValid({ month })).toBe(false);
  });
});
