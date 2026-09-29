/**
 * Contagem de tokens simplificada: 1 palavra = 1 token.
 * É uma aproximação proposital (o teste não usa um provedor de LLM real).
 */
export function countTokens(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function simulateAgentOutput(agentName: string, input: string): string {
  const words = countTokens(input);
  const firstSentence = input.trim().split(/(?<=[.!?])\s+/)[0] ?? input.trim();
  return `[${agentName}] Processed ${words} word(s). Summary: ${firstSentence}`;
}
