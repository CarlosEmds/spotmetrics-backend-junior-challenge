import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from './agent.entity';
import { AgentMonthlyUsage } from './agent-monthly-usage.entity';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

export function currentMonth(now: Date = new Date()): string {
  return now.toISOString().slice(0, 7);
}

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent) private readonly agents: Repository<Agent>,
    @InjectRepository(AgentMonthlyUsage) private readonly usage: Repository<AgentMonthlyUsage>,
  ) {}

  create(dto: CreateAgentDto): Promise<Agent> {
    return this.agents.save(this.agents.create({ ...dto, active: dto.active ?? true }));
  }

  findAll(): Promise<Agent[]> {
    return this.agents.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Agent> {
    const agent = await this.agents.findOne({ where: { id } });
    if (!agent) throw new NotFoundException(`Agent ${id} not found`);
    return agent;
  }

  async update(id: string, dto: UpdateAgentDto): Promise<Agent> {
    const agent = await this.findOne(id);
    this.agents.merge(agent, dto);
    return this.agents.save(agent);
  }

  /**
   * Soft delete: desativa o agente em vez de apagar a linha. Execuções e consumo continuam
   * no banco (são histórico de cobrança e as FKs não têm ON DELETE). Desfaz com PATCH { active: true }.
   */
  async remove(id: string): Promise<void> {
    const agent = await this.findOne(id);
    if (!agent.active) return;
    agent.active = false;
    await this.agents.save(agent);
  }

  async getUsage(id: string, month: string = currentMonth()) {
    const agent = await this.findOne(id);
    const row = await this.usage.findOne({ where: { agentId: id, month } });
    const tokensUsed = row?.tokensUsed ?? 0;
    return {
      agentId: agent.id,
      month,
      monthlyTokenLimit: agent.monthlyTokenLimit,
      tokensUsed,
      tokensRemaining: Math.max(agent.monthlyTokenLimit - tokensUsed, 0),
    };
  }
}
