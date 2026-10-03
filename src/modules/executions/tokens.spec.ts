import { countTokens, exceedsMonthlyLimit, simulateAgentOutput } from './tokens';

describe('tokens', () => {
  it('counts words as tokens', () => {
    expect(countTokens('hello   world  foo')).toBe(3);
  });

  it('returns 0 for empty input', () => {
    expect(countTokens('')).toBe(0);
    expect(countTokens('   ')).toBe(0);
  });

  it('builds a deterministic simulated output', () => {
    const out = simulateAgentOutput('Bot', 'First sentence. Second one.');
    expect(out).toBe('[Bot] Processed 4 word(s). Summary: First sentence.');
  });
});

describe('exceedsMonthlyLimit', () => {
  it('allows a request that fits exactly in the limit', () => {
    expect(exceedsMonthlyLimit(8, 2, 10)).toBe(false);
  });

  it('refuses a request that would pass the limit', () => {
    expect(exceedsMonthlyLimit(9, 2, 10)).toBe(true);
  });

  it('refuses any request when the limit is already used up', () => {
    expect(exceedsMonthlyLimit(10, 1, 10)).toBe(true);
  });
});
