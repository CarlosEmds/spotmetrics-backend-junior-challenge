import { countTokens, simulateAgentOutput } from './tokens';

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
