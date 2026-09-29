import dataSource from '../data-source';
import { Agent } from '../../modules/agents/agent.entity';
import { AgentMonthlyUsage } from '../../modules/agents/agent-monthly-usage.entity';
import { AgentExecution } from '../../modules/executions/agent-execution.entity';
import { ExecutionStatus } from '../../modules/executions/execution-status.enum';
import { countTokens } from '../../modules/executions/tokens';

const SUPPORT_AGENT_ID = '3b4f8f6e-1c2d-4a5b-9e8f-000000000001';
const SUMMARIZER_AGENT_ID = '3b4f8f6e-1c2d-4a5b-9e8f-000000000002';

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000);
}

async function seed(): Promise<void> {
  await dataSource.initialize();

  const agents = dataSource.getRepository(Agent);
  const executions = dataSource.getRepository(AgentExecution);
  const usage = dataSource.getRepository(AgentMonthlyUsage);

  if ((await agents.count()) > 0) {
    console.log('seed: database already has data, skipping');
    await dataSource.destroy();
    return;
  }

  await agents.save([
    agents.create({
      id: SUPPORT_AGENT_ID,
      name: 'Support Assistant',
      description: 'Responde dúvidas de clientes sobre pedidos e entregas',
      systemPrompt: 'Você é um assistente de suporte cordial. Responda de forma objetiva e em português.',
      active: true,
      monthlyTokenLimit: 10000,
    }),
    agents.create({
      id: SUMMARIZER_AGENT_ID,
      name: 'Summarizer',
      description: 'Resume textos longos em poucos parágrafos',
      systemPrompt: 'Resuma o texto recebido em no máximo três frases.',
      active: false,
      monthlyTokenLimit: 500,
    }),
  ]);

  const completed = (agentId: string, input: string, output: string, minutes: number) => {
    const inputTokens = countTokens(input);
    const outputTokens = countTokens(output);
    return executions.create({
      agentId,
      input,
      output,
      status: ExecutionStatus.COMPLETED,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      createdAt: minutesAgo(minutes),
      startedAt: minutesAgo(minutes - 0.05),
      completedAt: minutesAgo(minutes - 0.1),
    });
  };

  const seeded = await executions.save([
    completed(
      SUPPORT_AGENT_ID,
      'Meu pedido 4821 ainda não chegou, o que aconteceu?',
      '[Support Assistant] Processed 9 word(s). Summary: Meu pedido 4821 ainda não chegou, o que aconteceu?',
      180,
    ),
    completed(
      SUPPORT_AGENT_ID,
      'Como faço para trocar um produto com defeito?',
      '[Support Assistant] Processed 8 word(s). Summary: Como faço para trocar um produto com defeito?',
      120,
    ),
    executions.create({
      agentId: SUPPORT_AGENT_ID,
      input: 'Quero cancelar minha assinatura',
      status: ExecutionStatus.FAILED,
      error: 'Simulated provider timeout',
      createdAt: minutesAgo(60),
      startedAt: minutesAgo(59.9),
      completedAt: minutesAgo(59.8),
    }),
    executions.create({
      agentId: SUPPORT_AGENT_ID,
      input: 'Vocês entregam no exterior?',
      status: ExecutionStatus.PENDING,
      createdAt: minutesAgo(1),
    }),
    completed(
      SUMMARIZER_AGENT_ID,
      'A reunião de planejamento definiu as prioridades do trimestre: reduzir o tempo de resposta do suporte, ' +
        'migrar o serviço de notificações e revisar a política de limites de uso por cliente.',
      '[Summarizer] Processed 30 word(s). Summary: A reunião de planejamento definiu as prioridades do trimestre.',
      300,
    ),
  ]);

  const month = currentMonth();
  const totalsByAgent = new Map<string, number>();
  for (const execution of seeded) {
    totalsByAgent.set(execution.agentId, (totalsByAgent.get(execution.agentId) ?? 0) + execution.totalTokens);
  }

  await usage.save(
    [...totalsByAgent.entries()].map(([agentId, tokensUsed]) =>
      usage.create({ agentId, month, tokensUsed }),
    ),
  );

  console.log(`seed: created ${await agents.count()} agents and ${seeded.length} executions`);
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('seed failed', err);
  process.exit(1);
});
