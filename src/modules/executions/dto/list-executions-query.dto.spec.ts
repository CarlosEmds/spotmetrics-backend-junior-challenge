import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ExecutionStatus } from '../execution-status.enum';
import { ListExecutionsQueryDto } from './list-executions-query.dto';

async function invalidFields(data: object): Promise<string[]> {
  const errors = await validate(plainToInstance(ListExecutionsQueryDto, data));
  return errors.map((error) => error.property);
}

describe('ListExecutionsQueryDto', () => {
  it('uses page 1, limit 20 and newest first when nothing is sent', () => {
    const dto = plainToInstance(ListExecutionsQueryDto, {});

    expect(dto).toMatchObject({ page: 1, limit: 20, order: 'desc' });
    expect(dto.status).toBeUndefined();
  });

  it('converts the query string values to numbers', async () => {
    const dto = plainToInstance(ListExecutionsQueryDto, { page: '2', limit: '5' });

    expect(dto).toMatchObject({ page: 2, limit: 5 });
    expect(await validate(dto)).toEqual([]);
  });

  it('accepts a known status and the asc order', async () => {
    expect(await invalidFields({ status: ExecutionStatus.FAILED, order: 'asc' })).toEqual([]);
  });

  it.each([
    [{ page: '0' }, 'page'],
    [{ limit: '101' }, 'limit'],
    [{ status: 'DONE' }, 'status'],
    [{ order: 'up' }, 'order'],
  ])('rejects %p', async (query, field) => {
    expect(await invalidFields(query)).toEqual([field]);
  });
});
